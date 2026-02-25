package handlers

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
)

// LoginRequest represents login payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login authenticates a user
func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Find user via GORM
	var user domain.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_credentials",
			"message": "Email ou senha incorretos",
		})
	}

	// Check if active
	if !user.Active {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "user_blocked",
			"message": "Usuário bloqueado. Contate o administrador.",
		})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_credentials",
			"message": "Email ou senha incorretos",
		})
	}

	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}

	// Generate access token
	accessToken, err := middleware.GenerateToken(
		user.ID,
		user.Email,
		user.Role,
		companyID,
		h.Config.JWTSecret,
		h.Config.JWTExpireMinutes,
	)
	if err != nil {
		return ServerError(c, err)
	}

	// Generate refresh token
	refreshTokenStr := uuid.New().String()
	refreshToken := domain.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		Token:     refreshTokenStr,
		ExpiresAt: time.Now().AddDate(0, 0, h.Config.RefreshExpireDays),
	}
	h.DB.Create(&refreshToken)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user":         user,
			"accessToken":  accessToken,
			"refreshToken": refreshTokenStr,
			"expiresIn":    h.Config.JWTExpireMinutes * 60,
		},
	})
}

// RefreshTokenRequest represents refresh token payload
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// RefreshToken generates a new access token
func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Find refresh token via GORM
	var tokenData domain.RefreshToken
	if err := h.DB.Where("token = ? AND revoked = ?", req.RefreshToken, false).First(&tokenData).Error; err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_token",
			"message": "Refresh token inválido",
		})
	}

	// Check expiration
	if tokenData.ExpiresAt.Before(time.Now()) {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "token_expired",
			"message": "Refresh token expirado",
		})
	}

	// Find user via GORM
	var user domain.User
	if err := h.DB.First(&user, "id = ?", tokenData.UserID).Error; err != nil {
		return ServerError(c, err)
	}

	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}

	// Generate new access token
	accessToken, err := middleware.GenerateToken(
		user.ID,
		user.Email,
		user.Role,
		companyID,
		h.Config.JWTSecret,
		h.Config.JWTExpireMinutes,
	)
	if err != nil {
		return ServerError(c, err)
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"accessToken": accessToken,
		"expiresIn":   h.Config.JWTExpireMinutes * 60,
	})
}

// Logout revokes refresh token
func (h *Handler) Logout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Revoke all refresh tokens for user via GORM
	h.DB.Model(&domain.RefreshToken{}).Where("user_id = ?", userID).Update("revoked", true)

	return Success(c, fiber.Map{"message": "Logout realizado com sucesso"})
}

// ForgotPasswordRequest represents forgot password payload
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword initiates password reset
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Find user via GORM
	var user domain.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if user exists
		return Success(c, fiber.Map{"message": "Se o email existir, enviaremos instruções de recuperação"})
	}

	userID := user.ID
	userName := user.Name

	// Generate reset token
	token := uuid.New().String()
	expiration := time.Now().Add(1 * time.Hour)

	h.DB.Model(&domain.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"reset_token":            token,
		"reset_token_expires_at": expiration,
	})

	// Send notifications
	go func() {
		// Email
		if h.EmailService != nil {
			h.EmailService.SendPasswordResetEmail(req.Email, token, userName)
		}
	}()

	return Success(c, fiber.Map{"message": "Se o email existir, enviaremos instruções de recuperação"})
}

// ResetPasswordRequest represents reset password payload
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ResetPassword completes password reset
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	if req.Token == "" || req.NewPassword == "" {
		return BadRequest(c, "Token e nova senha são obrigatórios")
	}

	// Find user with valid token via GORM
	var user domain.User
	if err := h.DB.Where("reset_token = ? AND reset_token_expires_at > ?", req.Token, time.Now()).First(&user).Error; err != nil {
		return BadRequest(c, "Token inválido ou expirado")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, err)
	}

	// Update user via GORM
	h.DB.Model(&user).Updates(map[string]interface{}{
		"password_hash": string(hashedPassword),
		"reset_token":   nil,
	})

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

// GetCurrentUser returns the authenticated user
func (h *Handler) GetCurrentUser(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var user domain.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, user)
}

// UpdateCurrentUserRequest represents profile update payload
type UpdateCurrentUserRequest struct {
	Name      *string `json:"name"`
	Phone     *string `json:"phone"`
	AvatarURL *string `json:"avatarUrl"`
}

// UpdateCurrentUser updates the authenticated user's profile
func (h *Handler) UpdateCurrentUser(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req UpdateCurrentUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var user domain.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.AvatarURL != nil {
		user.AvatarURL = *req.AvatarURL
	}

	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, err)
	}

	return Success(c, user)
}

// ChangePasswordRequest represents password change payload
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword changes the authenticated user's password
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	log.Printf("🔐 Tentativa de alteração de senha para UserID: %s", userID)

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Get user via GORM
	var user domain.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return BadRequest(c, "Senha atual incorreta")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, err)
	}

	user.PasswordHash = string(hashedPassword)
	user.MustChangePassword = false
	h.DB.Save(&user)

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

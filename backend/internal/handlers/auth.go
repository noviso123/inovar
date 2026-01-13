package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
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

	// Find user
	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "invalid_credentials",
			"message": "Email ou senha incorretos",
		})
	}

	// Check if active
	if !user.Active {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "user_blocked",
			"message": "Usuário bloqueado. Contate o administrador.",
		})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "invalid_credentials",
			"message": "Email ou senha incorretos",
		})
	}

	// Get company ID
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
	refreshToken := models.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		Token:     refreshTokenStr,
		ExpiresAt: time.Now().AddDate(0, 0, h.Config.RefreshExpireDays),
		CreatedAt: time.Now(),
	}
	h.DB.Create(&refreshToken)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user": fiber.Map{
				"id":        user.ID,
				"name":      user.Name,
				"email":     user.Email,
				"role":      user.Role,
				"phone":     user.Phone,
				"active":    user.Active,
				"companyId": user.CompanyID,
			},
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

	// Find refresh token
	var refreshToken models.RefreshToken
	if err := h.DB.Where("token = ? AND revoked = ?", req.RefreshToken, false).First(&refreshToken).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "invalid_token",
			"message": "Refresh token inválido",
		})
	}

	// Check expiration
	if refreshToken.ExpiresAt.Before(time.Now()) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   "token_expired",
			"message": "Refresh token expirado",
		})
	}

	// Find user
	var user models.User
	if err := h.DB.First(&user, "id = ?", refreshToken.UserID).Error; err != nil {
		return ServerError(c, err)
	}

	// Get company ID
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

	// Revoke all refresh tokens for user
	h.DB.Model(&models.RefreshToken{}).Where("user_id = ?", userID).Update("revoked", true)

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

	// Find user
	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if user exists
		return Success(c, fiber.Map{"message": "Se o email existir, enviaremos instruções de recuperação"})
	}

	// Generate reset token
	token := uuid.New().String()
	expiration := time.Now().Add(1 * time.Hour)

	user.ResetToken = &token
	user.ResetTokenExpiresAt = &expiration
	h.DB.Save(&user)

	// Mock Email Sending - Print to console for testing
	// In production, integrate with SMTP
	println("==========================================")
	println("📧 MOCK EMAIL: Password Reset Requested")
	println("To: " + user.Email)
	println("Token: " + token)
	println("Link: http://localhost:3000/reset-password?token=" + token)
	println("==========================================")

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

	// Find user with valid token
	var user models.User
	if err := h.DB.Where("reset_token = ? AND reset_token_expires_at > ?", req.Token, time.Now()).First(&user).Error; err != nil {
		return BadRequest(c, "Token inválido ou expirado")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, err)
	}

	// Update user
	user.PasswordHash = string(hashedPassword)
	user.ResetToken = nil
	user.ResetTokenExpiresAt = nil
	user.UpdatedAt = time.Now()
	h.DB.Save(&user)

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

// GetCurrentUser returns the authenticated user
func (h *Handler) GetCurrentUser(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, user)
}

// UpdateCurrentUserRequest represents profile update payload
type UpdateCurrentUserRequest struct {
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	AvatarURL string `json:"avatarUrl"`
}

// UpdateCurrentUser updates the authenticated user's profile
func (h *Handler) UpdateCurrentUser(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req UpdateCurrentUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	user.Name = req.Name
	user.Phone = req.Phone
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	user.UpdatedAt = time.Now()

	h.DB.Save(&user)

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

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var user models.User
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
	user.UpdatedAt = time.Now()
	h.DB.Save(&user)

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

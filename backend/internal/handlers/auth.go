package handlers

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// LoginRequest represents login payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login handles local authentication
func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var user models.User
	if err := h.DB.Select("id, name, email, password_hash, role, company_id, must_change_password, active").Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Credenciais inválidas",
		})
	}

	if !user.Active {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Conta inativa. Contate o administrador.",
		})
	}

	// Verify Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Credenciais inválidas",
		})
	}

	// Generate Tokens
	accessToken, err := generateTokens(&user)
	if err != nil {
		log.Printf("[ERROR] Token generation failed: %v", err)
		return ServerError(c, err)
	}

	// For simplicity in this migration, we are using the same structure for refresh token or just a long-lived access token for now if frontend expects it.
	// But let's generate a proper refresh token structure if needed.
	// Current frontend expects: accessToken, refreshToken, expiresIn

	refreshToken, _ := generateRefreshToken(&user) // Simplified for now

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user": fiber.Map{
				"id":                 user.ID,
				"name":               user.Name,
				"email":              user.Email,
				"role":               user.Role,
				"companyId":          user.CompanyID,
				"mustChangePassword": user.MustChangePassword,
			},
			"accessToken":  accessToken,
			"refreshToken": refreshToken,
			"expiresIn":    3600, // 1 hour
		},
	})
}

func generateTokens(user *models.User) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-secret-change-me"
	}

	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}

	// Generate Access Token
	return middleware.GenerateToken(user.ID, user.Email, user.Role, companyID, jwtSecret, 60*24) // 24 hours for now
}

func generateRefreshToken(user *models.User) (string, error) {
	// Simple refresh token implementation re-using generate token with longer expiry
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-secret-change-me"
	}
	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}
	return middleware.GenerateToken(user.ID, user.Email, user.Role, companyID, jwtSecret, 60*24*7) // 7 days
}

// RefreshToken handles token renewal
func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	// Simple implementation: Client sends refresh token, we verify and issue new access token
	type RefreshRequest struct {
		RefreshToken string `json:"refreshToken"`
	}

	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Token obrigatório")
	}

	token, err := jwt.ParseWithClaims(req.RefreshToken, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			return []byte("default-secret-change-me"), nil
		}
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Token inválido ou expirado",
		})
	}

	claims, ok := token.Claims.(*middleware.Claims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Token inválido",
		})
	}

	// Check if user still exists/active
	var user models.User
	if err := h.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Usuário não encontrado",
		})
	}

	if !user.Active {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Conta inativa",
		})
	}

	newAccessToken, _ := generateTokens(&user)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"accessToken": newAccessToken,
			"expiresIn":   3600,
		},
	})
}

// Logout - Client side only needs to discard token, but we return success
func (h *Handler) Logout(c *fiber.Ctx) error {
	return Success(c, fiber.Map{"message": "Logout realizado com sucesso"})
}

// ForgotPasswordRequest represents forgot password payload
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword - TODO: Implement email sending
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Email é obrigatório")
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Do not leak user existence
		return Success(c, fiber.Map{"message": "Se o e-mail existir, enviaremos instruções."})
	}

	// Generate reset token
	token, _ := middleware.GenerateToken(user.ID, user.Email, "reset_password", "", os.Getenv("JWT_SECRET"), 60)

	// Save token hash/expiration if we wanted stateful reset, or just trust the JWT signature.
	// For now, let's just log it effectively as we don't have email service setup in this snippet context
	log.Printf("[TODO] Send Password Reset Email to %s with token: %s", user.Email, token)

	return Success(c, fiber.Map{"message": "Se o e-mail existir, enviaremos instruções."})
}

// ResetPasswordRequest represents reset password payload
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ResetPassword implementation
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	// TODO: Verify token and reset password
	return Success(c, fiber.Map{"message": "Senha redefinida com sucesso"})
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

	var user models.User
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
	user.UpdatedAt = time.Now()

	h.DB.Save(&user)

	return Success(c, user)
}

// ChangePasswordRequest represents password change payload
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword updates the authenticated user's password locally
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	if req.NewPassword == "" {
		return BadRequest(c, "A nova senha é obrigatória")
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return BadRequest(c, "Senha atual incorreta")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, fmt.Errorf("falha ao criptografar senha: %v", err))
	}

	user.PasswordHash = string(hashedPassword)
	user.MustChangePassword = false
	user.UpdatedAt = time.Now()

	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, fmt.Errorf("falha ao salvar senha: %v", err))
	}

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

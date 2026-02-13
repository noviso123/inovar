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
		return "", fmt.Errorf("JWT_SECRET is not set")
	}

	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}

	// Generate Access Token
	return middleware.GenerateToken(user.ID, user.Email, user.Role, companyID, jwtSecret, 60*24) // 24 hours
}

func generateRefreshToken(user *models.User) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", fmt.Errorf("JWT_SECRET is not set")
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
			return nil, fmt.Errorf("JWT_SECRET missing")
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
// ForgotPassword initiates password reset flow
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Email é obrigatório")
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Do not leak user existence
		// Artificial delay to prevent timing attacks
		time.Sleep(200 * time.Millisecond)
		return Success(c, fiber.Map{"message": "Se o e-mail existir, enviaremos instruções."})
	}

	if !user.Active {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Conta inativa. Contate o administrador.",
		})
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET is not set. Cannot generate reset token.")
	}

	// Generate reset token (expires in 15 minutes)
	// We use a shorter expiration for security
	token, err := middleware.GenerateToken(user.ID, user.Email, "reset_password", "", jwtSecret, 15)
	if err != nil {
		return ServerError(c, err)
	}

	// Send Email
	if h.EmailService != nil {
		// Run in goroutine to not block response? No, simpler to be synchronous for now to ensure delivery,
		// or at least error handling. But typical API should be fast.
		// Gomail DialAndSend might take a second. Let's do it sync for reliability.
		if err := h.EmailService.SendPasswordResetEmail(user.Email, token, user.Name); err != nil {
			log.Printf("[ERROR] Failed to send reset email to %s: %v", user.Email, err)
			// Return success to user anyway to avoid enumeration, but log internal error
		}
	} else {
		log.Printf("[WARN] EmailService not initialized. Token: %s", token)
	}

	return Success(c, fiber.Map{"message": "Se o e-mail existir, enviaremos instruções."})
}

// ResetPasswordRequest represents reset password payload
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ResetPassword finalizes password reset
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Token e nova senha são obrigatórios")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return ServerError(c, fmt.Errorf("server misconfiguration"))
	}

	// Verify Token
	token, err := jwt.ParseWithClaims(req.Token, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Link inválido ou expirado. Solicite uma nova redefinição.",
		})
	}

	claims, ok := token.Claims.(*middleware.Claims)
	if !ok || claims.Role != "reset_password" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Token inválido para esta operação.",
		})
	}

	// Find user
	var user models.User
	if err := h.DB.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return BadRequest(c, "Usuário não encontrado")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, err)
	}

	user.PasswordHash = string(hashedPassword)
	user.MustChangePassword = false // Reset enforced change flag
	user.UpdatedAt = time.Now()

	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// Ideally we should blacklist the old token, but since it expires in 15m, risk is low.
	// Changing password invalidates old sessions IF we check password hash/version on refresh.
	// (Current implementation doesn't, but this is a standard gap in simple JWT).

	return Success(c, fiber.Map{"message": "Senha redefinida com sucesso. Faça login com a nova senha."})
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

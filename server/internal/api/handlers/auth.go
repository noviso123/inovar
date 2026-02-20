package handlers

import (
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/api/middleware"
	"inovar/internal/infra/bridge"
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

	// Find user via Python bridge
	res, err := bridge.CallPyService("GET", "/db/users/by-email/"+req.Email, nil)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_credentials",
			"message": "Email ou senha incorretos",
		})
	}

	userData, ok := res["data"].(map[string]interface{})
	if !ok {
		return ServerError(c, fmt.Errorf("dados do usuário inválidos"))
	}
	active, _ := userData["active"].(bool)
	passwordHash, _ := userData["passwordHash"].(string)

	// Check if active
	if !active {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "user_blocked",
			"message": "Usuário bloqueado. Contate o administrador.",
		})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_credentials",
			"message": "Email ou senha incorretos",
		})
	}

	userID := userData["id"].(string)
	userRole := userData["role"].(string)
	var companyID string
	if cID, ok := userData["companyId"].(string); ok {
		companyID = cID
	}

	// Generate access token
	accessToken, err := middleware.GenerateToken(
		userID,
		req.Email,
		userRole,
		companyID,
		h.Config.JWTSecret,
		h.Config.JWTExpireMinutes,
	)
	if err != nil {
		return ServerError(c, err)
	}

	// Generate refresh token
	refreshTokenStr := uuid.New().String()
	tokenData := map[string]interface{}{
		"user_id":    userID,
		"token":      refreshTokenStr,
		"expires_at": time.Now().AddDate(0, 0, h.Config.RefreshExpireDays).Format(time.RFC3339),
	}
	bridge.CallPyService("POST", "/db/users/tokens", tokenData)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user":         userData,
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

	// Find refresh token via Python
	res, err := bridge.CallPyService("GET", "/db/users/tokens/"+req.RefreshToken, nil)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_token",
			"message": "Refresh token inválido",
		})
	}

	tokenData, ok := res["data"].(map[string]interface{})
	if !ok {
		return ServerError(c, fmt.Errorf("dados do token inválidos"))
	}
	expiresAtStr, _ := tokenData["expiresAt"].(string)
	expiresAt, _ := time.Parse(time.RFC3339, expiresAtStr)

	// Check expiration
	if expiresAt.Before(time.Now()) {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"error":   "token_expired",
			"message": "Refresh token expirado",
		})
	}

	// Find user via Python
	userID := tokenData["userId"].(string)
	resUser, err := bridge.CallPyService("GET", "/db/users/"+userID, nil)
	if err != nil {
		return ServerError(c, err)
	}

	userData := resUser["data"].(map[string]interface{})
	userEmail := userData["email"].(string)
	userRole := userData["role"].(string)
	var companyID string
	if cID, ok := userData["companyId"].(string); ok {
		companyID = cID
	}

	// Generate new access token
	accessToken, err := middleware.GenerateToken(
		userID,
		userEmail,
		userRole,
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

	// Revoke all refresh tokens for user via Python
	bridge.CallPyService("POST", "/db/users/tokens/revoke/"+userID, nil)

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

	// Find user via Python
	res, err := bridge.CallPyService("GET", "/db/users/by-email/"+req.Email, nil)
	if err != nil {
		// Don't reveal if user exists
		return Success(c, fiber.Map{"message": "Se o email existir, enviaremos instruções de recuperação"})
	}

	userData, ok := res["data"].(map[string]interface{})
	if !ok {
		return Success(c, fiber.Map{"message": "Se o email existir, enviaremos instruções de recuperação"})
	}
	userID, _ := userData["id"].(string)
	userName, _ := userData["name"].(string)

	// Generate reset token
	token := uuid.New().String()
	expiration := time.Now().Add(1 * time.Hour).Format(time.RFC3339)

	updateReq := map[string]interface{}{
		"reset_token":            token,
		"reset_token_expires_at": expiration,
	}
	bridge.CallPyService("PUT", "/db/users/"+userID, updateReq)

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

	// Find user with valid token via Python (this requires a custom filter or searching all users)
	// For efficiency, let's assume Python handles the token lookup if we add a route,
	// or we just use GET /db/users with a filter if supported.
	// Actually, let's just use the bridge to find the user by Token.

	// Assuming Python has a filter for reset_token or we check all (poor performance)
	// Let's call Python with a generic filter if we update the route, or just implement it.
	res, err := bridge.CallPyService("GET", "/db/users?reset_token="+req.Token, nil)
	if err != nil || len(res["data"].([]interface{})) == 0 {
		return BadRequest(c, "Token inválido ou expirado")
	}

	userList, ok := res["data"].([]interface{})
	if !ok || len(userList) == 0 {
		return BadRequest(c, "Token inválido ou expirado")
	}
	userData, ok := userList[0].(map[string]interface{})
	if !ok {
		return BadRequest(c, "Token inválido ou expirado")
	}
	userID, _ := userData["id"].(string)

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, err)
	}

	// Update user via Python
	updateReq := map[string]interface{}{
		"password_hash": string(hashedPassword),
		"reset_token":   nil,
	}
	bridge.CallPyService("PUT", "/db/users/"+userID, updateReq)

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

// GetCurrentUser returns the authenticated user
func (h *Handler) GetCurrentUser(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	res, err := bridge.CallPyService("GET", "/db/users/"+userID, nil)
	if err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, res["data"])
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

	res, err := bridge.CallPyService("PUT", "/db/users/"+userID, req)
	if err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, res["data"])
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

	// Get user via bridge (with hash for verification)
	res, err := bridge.CallPyService("GET", "/db/users/"+userID+"?include_hash=true", nil)
	if err != nil {
		return NotFound(c, "Usuário não encontrado")
	}
	userData, ok := res["data"].(map[string]interface{})
	if !ok {
		return ServerError(c, fmt.Errorf("dados do usuário inválidos"))
	}
	passwordHash, _ := userData["passwordHash"].(string)

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.CurrentPassword)); err != nil {
		return BadRequest(c, "Senha atual incorreta")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return ServerError(c, err)
	}

	updates := map[string]interface{}{
		"password_hash":        string(hashedPassword),
		"must_change_password": false,
	}

	bridge.CallPyService("PUT", "/db/users/"+userID, updates)

	return Success(c, fiber.Map{"message": "Senha alterada com sucesso"})
}

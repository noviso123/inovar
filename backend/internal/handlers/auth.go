package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// LoginRequest represents login payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login is disabled in favor of Supabase Auth
func (h *Handler) Login(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
		"error":   "migration_required",
		"message": "Este serviço de login legado foi desativado. Por favor, use a autenticação via Supabase.",
	})
}

// RefreshToken is disabled in favor of Supabase Auth
func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
		"error":   "migration_required",
		"message": "Este serviço de refresh token legado foi desativado. Por favor, use a autenticação via Supabase.",
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

// ForgotPassword is handled by Supabase Auth directly on the frontend
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
		"error":   "migration_required",
		"message": "Este serviço de recuperação legado foi desativado. Por favor, use o fluxo do Supabase.",
	})
}

// ResetPasswordRequest represents reset password payload
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ResetPassword is handled by Supabase Auth directly on the frontend
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
		"error":   "migration_required",
		"message": "Este serviço de reset legado foi desativado. Por favor, use o fluxo do Supabase.",
	})
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

// ChangePassword is handled by Supabase Auth on the frontend (updateUser)
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUpgradeRequired).JSON(fiber.Map{
		"error":   "migration_required",
		"message": "Este serviço de troca de senha legado foi desativado. Por favor, use o fluxo do Supabase.",
	})
}

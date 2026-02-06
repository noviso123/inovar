package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// GetWhatsAppStatus returns the current connection status and QR code
func (h *Handler) GetWhatsAppStatus(c *fiber.Ctx) error {
	// Only Admin or Prestador can verify status
	role := middleware.GetUserRole(c)
	if role != models.RoleAdmin && role != models.RolePrestador {
		return Forbidden(c, "Acesso não autorizado")
	}

	if h.WhatsAppService == nil {
		return Success(c, fiber.Map{
			"enabled": false,
			"status":  "service_not_initialized",
		})
	}

	connected, qrCode := h.WhatsAppService.GetStatus()

	return Success(c, fiber.Map{
		"enabled":   true,
		"connected": connected,
		"qrCode":    qrCode,
	})
}

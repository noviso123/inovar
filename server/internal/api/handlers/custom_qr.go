package handlers

import (
	"inovar/internal/domain"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func (h *Handler) GetCustomQRs(c *fiber.Ctx) error {
	companyID := c.Locals("companyId").(string)
	var qrs []domain.CustomQRCode

	if err := h.DB.Where("company_id = ?", companyID).Order("created_at desc").Find(&qrs).Error; err != nil {
		return ServerError(c, err)
	}

	return Success(c, qrs)
}

func (h *Handler) CreateCustomQR(c *fiber.Ctx) error {
	companyID := c.Locals("companyId").(string)
	var qr domain.CustomQRCode

	if err := c.BodyParser(&qr); err != nil {
		return BadRequest(c, "Corpo da requisição inválido")
	}

	qr.ID = uuid.New().String()
	qr.CompanyID = companyID

	if err := h.DB.Create(&qr).Error; err != nil {
		return ServerError(c, err)
	}

	return Created(c, qr)
}

func (h *Handler) DeleteCustomQR(c *fiber.Ctx) error {
	companyID := c.Locals("companyId").(string)
	id := c.Params("id")

	if err := h.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&domain.CustomQRCode{}).Error; err != nil {
		return ServerError(c, err)
	}

	return c.SendStatus(http.StatusNoContent)
}

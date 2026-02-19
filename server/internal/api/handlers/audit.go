package handlers

import (
	"github.com/gofiber/fiber/v2"
	"inovar/internal/domain"
)

// ListAuditLogs returns filtered audit logs
func (h *Handler) ListAuditLogs(c *fiber.Ctx) error {
	var logs []domain.AuditLog
	query := h.DB.Model(&domain.AuditLog{}).Order("created_at desc")

	// Filters
	if entity := c.Query("entity"); entity != "" {
		query = query.Where("entity = ?", entity)
	}
	if userId := c.Query("userId"); userId != "" {
		query = query.Where("user_id = ?", userId)
	}

	// Limit
	limit := c.QueryInt("limit", 100)
	query = query.Limit(limit)

	if err := query.Find(&logs).Error; err != nil {
		return ServerError(c, err)
	}

	return Success(c, logs)
}

package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/inovar/backend/internal/models"
)

// GetSettings returns all system settings
func (h *Handler) GetSettings(c *fiber.Ctx) error {
	var settings []models.Setting
	if err := h.DB.Find(&settings).Error; err != nil {
		return ServerError(c, err)
	}

	// Convert to map for frontend
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	// Defaut values if database is empty
	if len(settingsMap) == 0 {
		defaults := map[string]string{
			"sla_baixa":       "72", // hours
			"sla_media":       "48",
			"sla_alta":        "24",
			"sla_emergencial": "6",
			"lock_timeout":    "5",  // minutes
			"confirm_days":    "7",
		}
		return Success(c, defaults)
	}

	return Success(c, settingsMap)
}

// UpdateSettings updates system settings
func (h *Handler) UpdateSettings(c *fiber.Ctx) error {
	type SettingsRequest struct {
		Settings map[string]string `json:"settings"`
	}

	var req SettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Invalid JSON")
	}

	tx := h.DB.Begin()

	for key, value := range req.Settings {
		var setting models.Setting
		if err := tx.FirstOrInit(&setting, models.Setting{Key: key}).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}
		setting.Value = value
		if err := tx.Save(&setting).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}
	}

	tx.Commit()
	return Success(c, req.Settings)
}

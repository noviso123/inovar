package handlers

import (
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/inovar/backend/internal/utils"
)

// UploadFile uploads a generic file and returns the URL
func (h *Handler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return BadRequest(c, "Arquivo não fornecido")
	}

	// Check size (e.g. 10MB)
	if file.Size > 10*1024*1024 {
		return BadRequest(c, "Arquivo muito grande (máx 10MB)")
	}

	// Determine category based on extension or other logic
	category := "outros"
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp" {
		category = "imagens"
	} else if ext == ".pdf" {
		category = "documentos"
	}

	// Use "temp" or "geral" as subfolder since this is a generic upload endpoint
	subfolder := "geral"

	// Save using helper
	url, err := utils.SaveFile(c, file, category, subfolder)
	if err != nil {
		return ServerError(c, err)
	}

	// Return format compatible with what frontend might expect
	return Success(c, fiber.Map{
		"url":      url,
		"filename": filepath.Base(url),
		"success":  true,
	})
}

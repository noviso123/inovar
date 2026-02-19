package handlers

import (
	"path/filepath"

	"github.com/gofiber/fiber/v2"
)

// UploadFile uploads a generic file to Supabase Storage and returns the URL
func (h *Handler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return BadRequest(c, "Arquivo não fornecido")
	}

	// Check size (e.g. 10MB)
	if file.Size > 10*1024*1024 {
		return BadRequest(c, "Arquivo muito grande (máx 10MB)")
	}

	/*
		// Determine category based on extension
		category := "outros"
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp" {
			category = "imagens"
		} else if ext == ".pdf" {
			category = "documentos"
		}

		subfolder := "geral"
	*/

	// Upload to Local Storage
	url, err := h.StorageService.Upload(file)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, fiber.Map{
		"url":      url,
		"filename": filepath.Base(url),
		"success":  true,
	})
}

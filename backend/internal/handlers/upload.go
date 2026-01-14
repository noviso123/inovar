package handlers

import (
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	savePath := "./uploads/" + filename

	// Save file
	if err := c.SaveFile(file, savePath); err != nil {
		return ServerError(c, err)
	}

	// Return URL
	// The server serves /uploads at root via app.Static("/uploads", "./uploads")
	url := "/uploads/" + filename

	// Return format compatible with what frontend might expect or just a simple object
	return Success(c, fiber.Map{
		"url":      url,
		"filename": filename,
		"success":  true,
	})
}

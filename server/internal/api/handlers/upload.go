package handlers

import (
	"fmt"
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

	// Upload to Supabase Storage (via S3 protocol)
	var url string
	var uploadErr error

	uploadType := c.FormValue("type")
	companyID := c.FormValue("companyId")
	contextID := c.FormValue("contextId")

	if uploadType == "logo" {
		if companyID == "" {
			return BadRequest(c, "Company ID é obrigatório para logo")
		}
		url, uploadErr = h.StorageService.ProcessLogo(file, companyID)
	} else if uploadType == "orcamento" || uploadType == "orcamento-os" {
		if contextID == "" {
			return BadRequest(c, "Context ID (Nº OS) é obrigatório para orçamento")
		}
		// Pattern: documents/orcamento-os123.pdf
		customKey := fmt.Sprintf("documents/orcamento-os%s", contextID)
		url, uploadErr = h.StorageService.Upload(file, customKey)
	} else if uploadType == "laudo" || uploadType == "os-finalizada" {
		if contextID == "" {
			return BadRequest(c, "Context ID (Nº OS) é obrigatório para laudo")
		}
		// Pattern: documents/laudo-os123.pdf
		customKey := fmt.Sprintf("documents/laudo-os%s", contextID)
		url, uploadErr = h.StorageService.Upload(file, customKey)
	} else {
		url, uploadErr = h.StorageService.Upload(file)
	}

	if uploadErr != nil {
		return ServerError(c, uploadErr)
	}

	return Success(c, fiber.Map{
		"url":      url,
		"filename": filepath.Base(url),
		"success":  true,
	})
}

package utils

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// SanitizeFilename removes special characters and spaces
func SanitizeFilename(filename string) string {
	// Remove extension first
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)

	// Replace spaces with underscores
	name = strings.ReplaceAll(name, " ", "_")

	// Remove non-alphanumeric characters (except underscores and hyphens)
	reg, _ := regexp.Compile("[^a-zA-Z0-9_-]+")
	name = reg.ReplaceAllString(name, "")

	// Limit length
	if len(name) > 50 {
		name = name[:50]
	}

	return name + ext
}

// SaveFile saves a file to a structured path: storage/{category}/{subfolder}/{timestamp}_{sanitized_name}
// Returns the relative path to be stored in DB (e.g., /storage/imagens/123/...)
func SaveFile(c *fiber.Ctx, file *multipart.FileHeader, category string, subfolder string) (string, error) {
	// Base storage path
	basePath := "./storage"

	// Construct target directory
	targetDir := filepath.Join(basePath, category)
	if subfolder != "" {
		targetDir = filepath.Join(targetDir, subfolder)
	}

	// Ensure directory exists
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %v", err)
	}

	// Generate new filename
	timestamp := time.Now().Format("20060102_150405")
	sanitizedName := SanitizeFilename(file.Filename)
	newFilename := fmt.Sprintf("%s_%s", timestamp, sanitizedName)

	// Full system path
	fullPath := filepath.Join(targetDir, newFilename)

	// Save file
	if err := c.SaveFile(file, fullPath); err != nil {
		return "", fmt.Errorf("failed to save file: %v", err)
	}

	// Return relative path for URL/DB (using forward slashes)
	// Example: /storage/imagens/user123/20240114_120000_foto.jpg
	relPath := fmt.Sprintf("/storage/%s", category)
	if subfolder != "" {
		relPath = fmt.Sprintf("%s/%s", relPath, subfolder)
	}
	relPath = fmt.Sprintf("%s/%s", relPath, newFilename)

	return relPath, nil
}

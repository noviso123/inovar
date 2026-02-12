package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/inovar/backend/internal/config"
)

type StorageService struct {
	Config *config.Config
}

func NewStorageService(cfg *config.Config) *StorageService {
	return &StorageService{Config: cfg}
}

// UploadFile uploads a file to Local Storage
func (s *StorageService) UploadFile(file *multipart.FileHeader, folder string) (string, error) {
	// Create destination path
	destPath := filepath.Join("storage", folder)
	if err := os.MkdirAll(destPath, 0755); err != nil {
		return "", err
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	fullPath := filepath.Join(destPath, filename)

	// Save file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	if out, err := os.Create(fullPath); err == nil {
		defer out.Close()
		if _, err := io.Copy(out, src); err != nil {
			return "", err
		}
	} else {
		return "", err
	}

	// Return relative URL path
	return fmt.Sprintf("/storage/%s/%s", folder, filename), nil
}

package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"inovar/internal/infra/config"

	"github.com/google/uuid"
)

type StorageService struct {
	Config    *config.Config
	UploadDir string
}

func NewStorageService(cfg *config.Config) *StorageService {
	uploadDir := cfg.UploadDir
	if uploadDir == "" {
		uploadDir = "./data/uploads"
	}

	// Ensure upload directory exists
	os.MkdirAll(uploadDir, 0755)

	return &StorageService{
		Config:    cfg,
		UploadDir: uploadDir,
	}
}

func (s *StorageService) Upload(file *multipart.FileHeader, customKey ...string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Determine filename
	ext := strings.ToLower(filepath.Ext(file.Filename))
	filename := uuid.New().String() + ext
	if len(customKey) > 0 && customKey[0] != "" {
		// Sanitize custom key - replace path separators for subdirectories
		safeKey := strings.ReplaceAll(customKey[0], "/", string(os.PathSeparator))
		if filepath.Ext(safeKey) == "" {
			safeKey += ext
		}
		filename = safeKey
	}

	// Build full file path
	fullPath := filepath.Join(s.UploadDir, filename)

	// Ensure subdirectories exist
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create destination file
	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy content
	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Return URL path (served by Fiber Static)
	urlPath := "/uploads/" + strings.ReplaceAll(filename, string(os.PathSeparator), "/")
	return urlPath, nil
}

func (s *StorageService) ProcessLogo(file *multipart.FileHeader, companyID string) (string, error) {
	// Save logo with company-specific name
	logoKey := fmt.Sprintf("logos/company-%s", companyID)
	return s.Upload(file, logoKey)
}

func (s *StorageService) Delete(path string) error {
	if path == "" {
		return nil
	}

	// Convert URL path to file path
	// /uploads/filename.ext -> UploadDir/filename.ext
	relativePath := strings.TrimPrefix(path, "/uploads/")
	fullPath := filepath.Join(s.UploadDir, relativePath)

	// Only delete if file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return nil // File already gone, not an error
	}

	return os.Remove(fullPath)
}

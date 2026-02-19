package services

import (
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/inovar/backend/internal/config"
)

type StorageService struct {
	Config *config.Config
}

func NewStorageService(cfg *config.Config) *StorageService {
	// Ensure storage directory exists
	if _, err := os.Stat("storage/uploads"); os.IsNotExist(err) {
		os.MkdirAll("storage/uploads", 0755)
	}
	return &StorageService{Config: cfg}
}

func (s *StorageService) Upload(file *multipart.FileHeader) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	dstPath := filepath.Join("storage", "uploads", filename)

	// Create destination file
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy content
	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	// Return relative path or URL
	// Assuming static file serving is set up for /storage or similar
	// For now, return a path that the frontend can use if we serve /uploads
	return "/uploads/" + filename, nil
}

func (s *StorageService) Delete(path string) error {
	// Path comes in as /uploads/filename.ext or full URL
	// We need to extract just the filename or correct relative path
	// Simple clean: remove /uploads/ prefix if present
	cleanPath := filepath.Join("storage", path)
	return os.Remove(cleanPath)
}

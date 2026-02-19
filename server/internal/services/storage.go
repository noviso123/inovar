package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"inovar/internal/infra/bridge"
	"inovar/internal/infra/config"

	"github.com/google/uuid"
)

type StorageService struct {
	Config *config.Config
}

func NewStorageService(cfg *config.Config) *StorageService {
	return &StorageService{
		Config: cfg,
	}
}

func (s *StorageService) Upload(file *multipart.FileHeader, customKey ...string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Use custom key if provided, otherwise generate one
	ext := filepath.Ext(file.Filename)
	objectKey := uuid.New().String() + ext
	if len(customKey) > 0 && customKey[0] != "" {
		objectKey = customKey[0]
		// Append extension if missing
		if filepath.Ext(objectKey) == "" {
			objectKey += ext
		}
	}

	// Create a temp file to pass to Python
	tempFile, err := os.CreateTemp("", "upload-*"+ext)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, src); err != nil {
		return "", fmt.Errorf("failed to copy file to temp: %w", err)
	}

	// Call Python Bridge
	resp, err := bridge.CallPython("s3_upload", map[string]interface{}{
		"file_path":    tempFile.Name(),
		"object_key":   objectKey,
		"content_type": file.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", err
	}

	url, ok := resp.Data["url"].(string)
	if !ok {
		return "", fmt.Errorf("invalid response from bridge: missing url")
	}

	return url, nil
}

func (s *StorageService) ProcessLogo(file *multipart.FileHeader, companyID string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	ext := filepath.Ext(file.Filename)
	tempFile, err := os.CreateTemp("", "logo-*"+ext)
	if err != nil {
		return "", err
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, src); err != nil {
		return "", err
	}

	resp, err := bridge.CallPython("process_logo", map[string]interface{}{
		"file_path":  tempFile.Name(),
		"company_id": companyID,
	})
	if err != nil {
		return "", err
	}

	url, ok := resp.Data["url"].(string)
	if !ok {
		return "", fmt.Errorf("invalid response from bridge: missing url")
	}

	return url, nil
}

func (s *StorageService) Delete(path string) error {
	if path == "" {
		return nil
	}

	_, err := bridge.CallPython("s3_delete", map[string]interface{}{
		"object_key": path,
	})
	return err
}

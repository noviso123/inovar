package services

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
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

// UploadFile uploads a file to Supabase Storage
func (s *StorageService) UploadFile(file *multipart.FileHeader, folder string) (string, error) {
	// If Supabase is not configured, fallback to local (or error)
	if s.Config.SupabaseURL == "" {
		return "", fmt.Errorf("supabase not configured")
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Read file content
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, src); err != nil {
		return "", err
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s/%d%s", folder, time.Now().UnixNano(), ext)

	// Supabase Storage API URL
	url := fmt.Sprintf("%s/storage/v1/object/attachments/%s", s.Config.SupabaseURL, filename)

	req, err := http.NewRequest("POST", url, buf)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.Config.SupabaseKey)
	req.Header.Set("Content-Type", file.Header.Get("Content-Type"))
	// x-upsert header might be useful, but unique names avoid conflict

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("supabase upload failed (%d): %s", resp.StatusCode, string(body))
	}

	// Return public URL (assuming public bucket)
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/attachments/%s", s.Config.SupabaseURL, filename)
	return publicURL, nil
}

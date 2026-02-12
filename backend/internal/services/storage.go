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

// UploadFile uploads a file to Supabase Storage via REST API
func (s *StorageService) UploadFile(file *multipart.FileHeader, folder string) (string, error) {
	if s.Config.SupabaseURL == "" || s.Config.SupabaseKey == "" {
		return "", fmt.Errorf("supabase credentials not configured")
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
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	// Supabase Storage API URL (Bucket: attachments)
	url := fmt.Sprintf("%s/storage/v1/object/attachments/%s/%s", s.Config.SupabaseURL, folder, filename)

	req, err := http.NewRequest("POST", url, buf)
	if err != nil {
		return "", err
	}

	// Use Service Key if available for bypass, otherwise Anon Key
	key := s.Config.SupabaseServiceKey
	if key == "" {
		key = s.Config.SupabaseKey
	}

	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", file.Header.Get("Content-Type"))

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

	// Return public URL
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/attachments/%s/%s", s.Config.SupabaseURL, folder, filename)
	return publicURL, nil
}

package shared

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// UploadToSupabase uploads a file to Supabase Storage
func UploadToSupabase(file *multipart.FileHeader, folder string) (string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return "", fmt.Errorf("Supabase credentials not configured")
	}

	// Open file
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
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
	path := fmt.Sprintf("%s/%s", folder, filename)

	// Upload to Supabase Storage
	url := fmt.Sprintf("%s/storage/v1/object/attachments/%s", supabaseURL, path)

	req, err := http.NewRequest("POST", url, buf)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", file.Header.Get("Content-Type"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("upload failed with status: %d", resp.StatusCode)
	}

	// Return public URL
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/attachments/%s", supabaseURL, path)
	return publicURL, nil
}

package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	ref := "bxbupbnjcingfvjszrau"
	token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4YnVwYm5qY2luZ2Z2anN6cmF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4MTIyMSwiZXhwIjoyMDg1OTU3MjIxfQ.BrD2X6EhSW9u7wyP2zBmgscvhRvcDM34Ua4jBIyG9ZY"
	storageDir := "./storage"

	fmt.Println("🚀 Starting Storage Migration...")

	err := filepath.Walk(storageDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		// Rel path as bucket path
		relPath, _ := filepath.Rel(storageDir, path)
		relPath = strings.ReplaceAll(relPath, "\\", "/")

		fmt.Printf("📤 Uploading: %s...", relPath)

		// Read file
		data, err := os.ReadFile(path)
		if err != nil {
			fmt.Printf("❌ Read error: %v\n", err)
			return nil
		}

		// Upload to bucket
		url := fmt.Sprintf("https://%s.supabase.co/storage/v1/object/attachments/%s", ref, relPath)
		req, _ := http.NewRequest("POST", url, bytes.NewBuffer(data))
		req.Header.Set("Authorization", "Bearer "+token)
		// Try to detect content type
		contentType := "application/octet-stream"
		if strings.HasSuffix(relPath, ".jpg") || strings.HasSuffix(relPath, ".jpeg") {
			contentType = "image/jpeg"
		} else if strings.HasSuffix(relPath, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(relPath, ".pdf") {
			contentType = "application/pdf"
		}
		req.Header.Set("Content-Type", contentType)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("❌ Connection error: %v\n", err)
			return nil
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 || resp.StatusCode == 201 {
			fmt.Println("✅ DONE")
		} else {
			body, _ := io.ReadAll(resp.Body)
			fmt.Printf("❌ Failed (%d): %s\n", resp.StatusCode, string(body))
		}

		return nil
	})

	if err != nil {
		fmt.Printf("❌ Migration error: %v\n", err)
	} else {
		fmt.Println("🎉 Storage migration completed!")
	}
}

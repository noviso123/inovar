package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

func main() {
	token := "sbp_22b58c390f25b04776a38849a92ef19133f7fd29"
	ref := "bxbupbnjcingfvjszrau"
	newPassword := "Inovar2025-Admin"

	url := fmt.Sprintf("https://api.supabase.com/v1/projects/%s/config/database/password", ref)

	payload := map[string]string{
		"password": newPassword,
	}
	jsonData, _ := json.Marshal(payload)

	req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("🚀 Resetting database password for project %s...\n", ref)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("❌ Request failed: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		log.Fatalf("❌ Reset failed (%d): %s", resp.StatusCode, string(body))
	}

	fmt.Println("🎉 Database password successfully reset to: Inovar2025-Admin")
}

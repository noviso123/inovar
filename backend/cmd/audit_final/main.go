package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	baseURL = "https://inovar-gestao-893228897791.southamerica-east1.run.app"
)

func main() {
	fmt.Println("🔍 INOVAR GESTAO - FINAL PRODUCTION AUDIT 🚀")
	fmt.Println("Base URL: " + baseURL)
	fmt.Println("-------------------------------------------")

	// 1. Health Check
	fmt.Print("1. Backend Health Check... ")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(baseURL + "/health")
	if err != nil {
		fmt.Printf("❌ FAILED: %v\n", err)
	} else {
		fmt.Println("✅ SUCCESS (" + resp.Status + ")")
		resp.Body.Close()
	}

	// 2. Login Integration Test
	fmt.Print("2. Admin Login... ")
	loginData := map[string]string{
		"email":    "admin@inovar.com",
		"password": "123456",
	}
	loginBody, _ := json.Marshal(loginData)
	resp, err = client.Post(baseURL+"/api/auth/login", "application/json", bytes.NewBuffer(loginBody))

	var token string
	if err != nil {
		fmt.Printf("❌ FAILED: %v\n", err)
	} else {
		if resp.StatusCode == 200 {
			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)

			if data, ok := result["data"].(map[string]interface{}); ok {
				token = data["accessToken"].(string)
				fmt.Println("✅ SUCCESS")
			} else {
				fmt.Println("❌ FAILED: Invalid response structure")
			}
		} else {
			body, _ := io.ReadAll(resp.Body)
			fmt.Printf("❌ FAILED (Status: %d): %s\n", resp.StatusCode, string(body))
		}
		resp.Body.Close()
	}

	if token != "" {
		// 3. Protected Route (User List)
		fmt.Print("3. List Users (DB Integration)... ")
		req, _ := http.NewRequest("GET", baseURL+"/api/users", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err = client.Do(req)
		if err != nil {
			fmt.Printf("❌ FAILED: %v\n", err)
		} else {
			if resp.StatusCode == 200 {
				fmt.Println("✅ SUCCESS")
			} else {
				fmt.Printf("❌ FAILED (Status: %d)\n", resp.StatusCode)
			}
			resp.Body.Close()
		}

		// 4. Storage Test (Upload Check)
		fmt.Print("4. Storage Service Reachability... ")
		// Sending a request without file to check auth and routing
		req, _ = http.NewRequest("POST", baseURL+"/api/upload", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err = client.Do(req)
		if err != nil {
			fmt.Printf("❌ FAILED: %v\n", err)
		} else {
			// 400 Bad Request means it reached the handler and validated auth, but missing file
			if resp.StatusCode == 400 || resp.StatusCode == 200 {
				fmt.Println("✅ SUCCESS (Endpoint Active)")
			} else {
				fmt.Printf("❌ FAILED (Status: %d)\n", resp.StatusCode)
			}
			resp.Body.Close()
		}
	} else {
		fmt.Println("⚠️ Skipping auth-dependent tests due to login failure.")
	}

	fmt.Println("-------------------------------------------")
	fmt.Println("Audit Finished.")
}

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	projectRef := "bxbupbnjcingfvjszrau"
	supabaseURL := fmt.Sprintf("https://%s.supabase.co/rest/v1", projectRef)
	supabaseKey := os.Getenv("SUPABASE_KEY") // This is the service_role key found in .env

	if supabaseKey == "" {
		log.Fatal("❌ SUPABASE_KEY is empty in .env!")
	}

	fmt.Println("🚀 SUPABASE API WIPE - FINAL MISSION")
	fmt.Println("URL:", supabaseURL) // Added URL output
	fmt.Println("-------------------------------------")

	// Tables in HIERARCHICAL order (Children first to satisfy Foreign Keys)
	tables := []string{
		"audit_logs",
		"solicitacao_historico", // Fixed name
		"solicitacao_equipamentos",
		"checklists",
		"anexos",
		"agenda", // Fixed name
		"orcamento_itens",
		"expenses",
		"notas_fiscais",
		"nfse_eventos",
		"solicitacoes",
		"equipamentos",
		"clientes",
		"tecnicos",
		"prestadores",
		"refresh_tokens",
		"certificados_digitais",
		"configuracoes_fiscais",
		"enderecos",
		"settings",
		"users",
	}

	client := &http.Client{}

	for _, table := range tables {
		fmt.Printf("🚽 Deleting %s... ", table)

		// URL format: /table?id=not.eq.00000000-0000-0000-0000-000000000000
		filter := "id=not.eq.00000000-0000-0000-0000-000000000000"
		if table == "settings" {
			filter = "name=not.eq.dummy_non_existent_setting_name"
		}

		req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/%s?%s", supabaseURL, table, filter), nil)
		req.Header.Set("apikey", supabaseKey)
		req.Header.Set("Authorization", "Bearer "+supabaseKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("❌ %v\n", err)
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			fmt.Println("✅ DONE")
		} else {
			body, _ := io.ReadAll(resp.Body)
			fmt.Printf("⚠️  (%d) %s\n", resp.StatusCode, string(body))
		}
		resp.Body.Close()
	}

	fmt.Println("\n🌱 Re-seeding requested users...")

	hash := "$2a$10$ckQj0PkGWukGLe1xIPAblu6F1H4A5EoEvq0kRPupIMiGQoEedMCRK" // bcrypt for 123456

	users := []map[string]interface{}{
		{
			"id":            "d3e4f5a6-b7c8-4d9e-a0b1-c2d3e4f5a6b7",
			"name":          "Admin Inovar",
			"email":         "admin@inovar.com",
			"password_hash": hash,
			"role":          "ADMIN_SISTEMA",
			"active":        true,
		},
		{
			"id":            "e4f5a6b7-c8d9-4e0f-a1b2-c3d4e5f6a7b8",
			"name":          "Cliente Teste",
			"email":         "clientets@teste.com",
			"password_hash": hash,
			"role":          "CLIENTE",
			"active":        true,
		},
	}

	for _, user := range users {
		fmt.Printf("👤 Creating %s... ", user["email"]) // Changed message

		body, _ := json.Marshal(user)
		req, _ := http.NewRequest("POST", fmt.Sprintf("%s/users", supabaseURL), bytes.NewBuffer(body))
		req.Header.Set("apikey", supabaseKey)
		req.Header.Set("Authorization", "Bearer "+supabaseKey)
		req.Header.Set("Content-Type", "application/json")
		// Removed req.Header.Set("Prefer", "return=representation")

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("❌ %v\n", err) // Changed error message
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			fmt.Println("✅ OK")
		} else {
			body, _ := io.ReadAll(resp.Body)
			fmt.Printf("❌ %s\n", string(body)) // Changed failure message
		}
		resp.Body.Close()
	}

	fmt.Println("-------------------------------------")
	// Removed fmt.Println("🎯 REST API MISSION FINISHED.")
}

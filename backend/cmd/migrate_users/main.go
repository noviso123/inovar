package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/models"
	"github.com/joho/godotenv"
	"github.com/supabase-community/gotrue-go/types"
	"github.com/supabase-community/supabase-go"
)

func main() {
	// Load environment variables
	godotenv.Load()
	cfg := config.Load()

	// SECURE KEYS FROM USER (Load from ENV)
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	password := os.Getenv("SUPABASE_DB_PASSWORD")
	projectRef := os.Getenv("SUPABASE_PROJECT_REF")

	if serviceKey == "" || password == "" || projectRef == "" {
		log.Fatal("❌ Erro: Variáveis de ambiente SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD e SUPABASE_PROJECT_REF são obrigatórias.")
	}

	// Verified Regional Pooler (sa-east-1)
	dbURL := fmt.Sprintf("postgres://postgres.%s:%s@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require", projectRef, password)

	// Initialize database
	fmt.Printf("📂 Conectando ao Banco de Dados (Regional sa-east-1: %s)...\n", projectRef)
	db, err := database.Connect(dbURL)
	if err != nil {
		log.Fatalf("❌ Falha fatal de conexão: %v", err)
	}

	// Initialize Supabase Client with Service Key
	client, err := supabase.NewClient(cfg.SupabaseURL, serviceKey, &supabase.ClientOptions{})
	if err != nil {
		log.Fatalf("Failed to initialize Supabase client: %v", err)
	}

	// Fetch all users from local DB
	var users []models.User
	if err := db.Find(&users).Error; err != nil {
		log.Fatalf("Failed to fetch users: %v", err)
	}

	fmt.Printf("\n🔍 Encontrados %d usuários para análise...\n", len(users))

	for _, user := range users {
		if user.SupabaseID != nil && *user.SupabaseID != "" {
			fmt.Printf("⏩ Usuário %s já migrado (%s). Pulando.\n", user.Email, *user.SupabaseID)
			continue
		}

		fmt.Printf("🚀 Processando usuário: %s...\n", user.Email)

		var idStr string

		// 1. Try to create the user
		tempPw := "InovarStart123!"
		res, err := client.Auth.AdminCreateUser(types.AdminCreateUserRequest{
			Email:        user.Email,
			Password:     &tempPw,
			EmailConfirm: true,
		})

		if err != nil {
			fmt.Printf("⚠️ Usuário já existe ou erro na criação: %v. Tentando buscar ID...\n", err)

			// 2. If already exists, search for the user by email
			userList, err := client.Auth.AdminListUsers()
			if err != nil {
				fmt.Printf("❌ Falha ao listar usuários do Supabase: %v\n", err)
				continue
			}

			found := false
			for _, u := range userList.Users {
				if u.Email == user.Email {
					idStr = u.ID.String()
					found = true
					break
				}
			}

			if !found {
				fmt.Printf("❌ Usuário %s não encontrado no Supabase mesmo após erro de conflito.\n", user.Email)
				continue
			}
		} else {
			idStr = res.ID.String()
		}

		// 3. Update local DB
		user.SupabaseID = &idStr
		user.UpdatedAt = time.Now()
		if err := db.Save(&user).Error; err != nil {
			fmt.Printf("❌ Falha ao salvar SupabaseID para %s: %v\n", user.Email, err)
			continue
		}

		fmt.Printf("✅ Usuário %s vinculado com sucesso! ID: %s\n", user.Email, idStr)
	}

	fmt.Println("\n🏁 MIGAÇÃO E VINCULAÇÃO 100% CONCLUÍDAS!")
}

package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/models"
	"github.com/joho/godotenv"
	"github.com/supabase-community/gotrue-go/types"
	"github.com/supabase-community/supabase-go"
	"golang.org/x/crypto/bcrypt"
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

	fmt.Printf("\n🔍 Encontrados %d usuários para reset de senha...\n", len(users))

	newPassword := "123456"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)

	for _, user := range users {
		fmt.Printf("🚀 Resetando senha para usuário: %s...\n", user.Email)

		// 1. Update Supabase if linked
		if user.SupabaseID != nil && *user.SupabaseID != "" {
			uid, _ := uuid.Parse(*user.SupabaseID)
			_, err := client.Auth.AdminUpdateUser(types.AdminUpdateUserRequest{
				UserID:   uid,
				Password: newPassword,
			})
			if err != nil {
				fmt.Printf("⚠️ Erro ao resetar no Supabase para %s: %v\n", user.Email, err)
			} else {
				fmt.Printf("✅ Supabase resetado para %s\n", user.Email)
			}
		} else {
			fmt.Printf("ℹ️ Usuário %s não está vinculado ao Supabase. Pulando auth reset.\n", user.Email)
		}

		// 2. Update local DB (Password Hash + MustChangePassword)
		user.PasswordHash = string(hashedPassword)
		user.MustChangePassword = true
		user.UpdatedAt = time.Now()

		if err := db.Save(&user).Error; err != nil {
			fmt.Printf("❌ Falha ao salvar no banco local para %s: %v\n", user.Email, err)
			continue
		}

		fmt.Printf("✅ DB Local resetado para %s\n", user.Email)
	}

	fmt.Println("\n🏁 RESET DE SENHAS 100% CONCLUÍDO!")
}

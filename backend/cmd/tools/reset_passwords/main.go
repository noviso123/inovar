package main

import (
	"fmt"
	"log"
	"time"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/models"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load environment variables
	godotenv.Load()
	cfg := config.Load()

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Falha fatal de conexão: %v", err)
	}

	// Fetch all users from local DB
	var users []models.User
	if err := db.Find(&users).Error; err != nil {
		log.Fatalf("Failed to fetch users: %v", err)
	}

	fmt.Printf("\n🔍 Encontrados %d usuários para reset de senha (LOCAL ONLY)...\n", len(users))

	newPassword := "123456"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)

	for _, user := range users {
		fmt.Printf("🚀 Resetando senha para usuário: %s...\n", user.Email)

		// Update local DB (Password Hash + MustChangePassword)
		user.PasswordHash = string(hashedPassword)
		user.MustChangePassword = true
		user.UpdatedAt = time.Now()

		if err := db.Model(&user).Updates(map[string]interface{}{
			"password_hash":        user.PasswordHash,
			"must_change_password": user.MustChangePassword,
			"updated_at":           user.UpdatedAt,
		}).Error; err != nil {
			fmt.Printf("❌ Falha ao salvar no banco local para %s: %v\n", user.Email, err)
			continue
		}

		fmt.Printf("✅ DB Local resetado para %s (Senha: %s)\n", user.Email, newPassword)
	}

	fmt.Println("\n🏁 RESET DE SENHAS 100% CONCLUÍDO!")
}

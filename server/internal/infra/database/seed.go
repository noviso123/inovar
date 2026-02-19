package database

import (
	"log"
	"time"

	"inovar/internal/domain"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	log.Println("🌱 Checking seed data...")

	// Hash password 123456
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	// Users to seed
	users := []domain.User{
		{
			ID:                 "d3e4f5a6-b7c8-4d9e-a0b1-c2d3e4f5a6b7",
			Name:               "Admin Inovar",
			Email:              "admin@inovar.com",
			Role:               "ADMIN_SISTEMA",
			Phone:              "(11) 99999-0000",
			Active:             true,
			MustChangePassword: true,
		},
		{
			ID:                 uuid.New().String(),
			Name:               "Técnico Exemplo",
			Email:              "tech@inovar.com",
			Role:               "TECNICO",
			Phone:              "(11) 98888-1111",
			Active:             true,
			MustChangePassword: true,
		},
		{
			ID:                 uuid.New().String(),
			Name:               "Cliente Exemplo",
			Email:              "client@inovar.com",
			Role:               "CLIENTE",
			Phone:              "(11) 97777-2222",
			Active:             true,
			MustChangePassword: true,
		},
	}

	for _, user := range users {
		var count int64
		db.Model(&domain.User{}).Where("email = ?", user.Email).Count(&count)
		if count == 0 {
			user.PasswordHash = string(hashedPassword)
			user.CreatedAt = time.Now()
			if err := db.Create(&user).Error; err != nil {
				log.Printf("⚠️ Error creating %s: %v\n", user.Role, err)
			} else {
				log.Printf("✅ Created %s: %s / 123456\n", user.Role, user.Email)
			}
		} else {
			log.Printf("ℹ️ %s already exists: %s\n", user.Role, user.Email)
		}
	}

	log.Println("🎉 Seed check complete.")
}

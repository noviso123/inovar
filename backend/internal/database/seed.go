package database

import (
	"log"
	"time"

	"github.com/inovar/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	log.Println("⚠️ Seeding disabled for local production mode.")
	// Hash password 123456
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	// Create Admin
	adminID := "d3e4f5a6-b7c8-4d9e-a0b1-c2d3e4f5a6b7"
	admin := models.User{
		ID:                 adminID,
		Name:               "Admin Inovar",
		Email:              "admin@inovar.com",
		PasswordHash:       string(hashedPassword),
		Role:               "ADMIN_SISTEMA",
		Phone:              "(11) 99999-0000",
		Active:             true,
		MustChangePassword: true,
		CreatedAt:          time.Now(),
	}

	// Check if admin exists
	var count int64
	db.Model(&models.User{}).Where("email = ?", admin.Email).Count(&count)
	if count == 0 {
		if err := db.Create(&admin).Error; err != nil {
			log.Println("⚠️ Admin creation error:", err)
		} else {
			log.Println("✅ Created admin:", admin.Email)
		}
	} else {
		log.Println("ℹ️ Admin already exists:", admin.Email)
	}

	/*
			// Create Example Client
			clientID := "e4f5a6b7-c8d9-4e0f-a1b2-c3d4e5f6a7b8"
			client := models.User{
				ID:           clientID,
				Name:         "Cliente Teste",
				Email:        "clientets@teste.com",
				PasswordHash: string(hashedPassword),
				Role:         "CLIENTE",
				Phone:        "(11) 98888-8888",
				Active:       true,
				CreatedAt:    time.Now(),
			}
		    // ... check and create client ...
	*/

	log.Println("🎉 Database seeded check complete.")

}

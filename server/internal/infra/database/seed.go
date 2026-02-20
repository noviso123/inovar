package database

import (
	"log"
	"time"

	"inovar/internal/domain"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Seed creates only the essential admin user if no users exist
func Seed(db *gorm.DB) {
	log.Println("🌱 Checking initial setup...")

	// Only create admin user if NO users exist at all
	var userCount int64
	db.Model(&domain.User{}).Count(&userCount)

	if userCount > 0 {
		log.Printf("ℹ️ Database has %d users. Skipping seed.", userCount)
		return
	}

	// First-time setup: create admin user
	log.Println("🆕 First run detected. Creating initial admin user...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	admin := domain.User{
		ID:                 uuid.New().String(),
		Name:               "Administrador",
		Email:              "admin@inovar.com",
		PasswordHash:       string(hashedPassword),
		Role:               domain.RoleAdmin,
		Active:             true,
		MustChangePassword: true,
		CreatedAt:          time.Now(),
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("⚠️ Error creating admin user: %v", err)
	} else {
		log.Printf("✅ Admin user created: admin@inovar.com / 123456")
		log.Printf("⚠️ IMPORTANT: Change this password on first login!")
	}

	log.Println("🎉 Initial setup complete.")
}

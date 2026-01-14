package database

import (
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/inovar/backend/internal/models"
)

func Seed(db *gorm.DB) {
	// Check if already seeded
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		log.Println("📦 Database already seeded, skipping...")
		return
	}

	log.Println("🌱 Seeding initial data...")

	// Hash password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	// Create Admin
	admin := models.User{
		ID:           uuid.New().String(),
		Name:         "Admin Inovar",
		Email:        "admin@inovar.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAdmin,
		Phone:        "(11) 99999-0000",
		Active:       true,
		CreatedAt:    time.Now(),
	}
	if err := db.Create(&admin).Error; err != nil {
		log.Println("❌ Error creating admin:", err)
	} else {
		log.Println("✅ Created admin:", admin.Email)
	}

	log.Println("🎉 Initial admin created successfully!")

	// Default settings
	settings := []models.Setting{
		{Key: "sla_baixa", Value: "72", Description: "SLA em horas para prioridade Baixa"},
		{Key: "sla_media", Value: "48", Description: "SLA em horas para prioridade Média"},
		{Key: "sla_alta", Value: "24", Description: "SLA em horas para prioridade Alta"},
		{Key: "sla_emergencial", Value: "6", Description: "SLA em horas para prioridade Emergencial"},
		{Key: "lock_timeout", Value: "300", Description: "Timeout de lock em segundos"},
		{Key: "confirm_days", Value: "7", Description: "Dias para confirmação do cliente"},
	}
	for _, s := range settings {
		db.Create(&s)
	}

	log.Println("✅ Seed completed")
}

package database

import (
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/inovar/backend/internal/models"
)

func Seed(db *gorm.DB) {
	// Hash password 123456
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	// Create Admin
	adminID := "d3e4f5a6-b7c8-4d9e-a0b1-c2d3e4f5a6b7"
	admin := models.User{
		ID:           adminID,
		Name:         "Admin Inovar",
		Email:        "admin@inovar.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAdmin,
		Phone:        "(11) 99999-0000",
		Active:       true,
		CreatedAt:    time.Now(),
	}
	if err := db.Create(&admin).Error; err != nil {
		log.Println("⚠️ Admin already exists or error:", err)
	} else {
		log.Println("✅ Created admin:", admin.Email)
	}

	// Create Example Client
	clientID := "e4f5a6b7-c8d9-4e0f-a1b2-c3d4e5f6a7b8"
	client := models.User{
		ID:           clientID,
		Name:         "Cliente Teste",
		Email:        "clientets@teste.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleCliente,
		Phone:        "(11) 98888-8888",
		Active:       true,
		CreatedAt:    time.Now(),
	}
	if err := db.Create(&client).Error; err != nil {
		log.Println("⚠️ Client already exists or error:", err)
	} else {
		log.Println("✅ Created client:", client.Email)
	}

	log.Println("🎉 Database seeded with requested users.")

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
		db.FirstOrCreate(&s, models.Setting{Key: s.Key})
	}

	log.Println("✅ Seed completed")
}

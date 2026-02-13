package database

import (
	"log"

	"gorm.io/gorm"

	"github.com/inovar/backend/internal/models"
)

func Seed(db *gorm.DB) {
	// Users seeding removed per request (Real data only)
	// Create initial admin manually or via registration if enabled.

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

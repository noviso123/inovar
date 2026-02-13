package main

import (
	"log"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/models"
)

func main() {
	// Request ID provided by user context
	requestID := "926a1a74-7c4c-4988-80fc-06f43e7c22cb"

	log.Println("🧹 Starting checklist cleanup for request:", requestID)

	// Load config and connect to DB
	cfg := config.Load()
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	// Delete checklists
	result := db.Where("solicitacao_id = ?", requestID).Delete(&models.Checklist{})
	if result.Error != nil {
		log.Fatalf("❌ Failed to delete checklists: %v", result.Error)
	}

	log.Printf("✅ Deleted %d checklist items successfully!", result.RowsAffected)
}

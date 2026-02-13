package main

import (
	"log"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/models"
)

func main() {
	// Load config
	cfg := config.Load()

	// Connect to DB
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("🗑️ Deleting ALL clients from database...")

	tx := db.Begin()

	// Get all clients
	var clients []models.Cliente
	db.Find(&clients)

	log.Printf("Found %d clients to delete", len(clients))

	for _, client := range clients {
		// Delete the client's user first
		tx.Unscoped().Where("id = ?", client.UserID).Delete(&models.User{})
		// Delete the client record
		tx.Unscoped().Delete(&client)
		log.Printf("  ✅ Deleted client: %s (ID: %s)", client.Name, client.ID)
	}

	// Also clean up orphan enderecos
	tx.Exec("DELETE FROM enderecos WHERE id NOT IN (SELECT DISTINCT endereco_id FROM clientes WHERE endereco_id IS NOT NULL)")

	if err := tx.Commit().Error; err != nil {
		log.Fatalf("Error committing: %v", err)
	}

	log.Println("✅ All clients deleted successfully!")
}

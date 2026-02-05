package main

import (
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Connect to database
	// Use absolute path to avoid confusion
	dbPath := "c:\\Users\\jtsat\\Downloads\\inovar\\inovar\\backend\\inovar.db"

	log.Printf("Opening database at: %s", dbPath)
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Tables to truncate (Child tables first to avoid FK constraints if enforced, though SQLite usually needs PRAGMA foreign_keys=ON)
	tables := []string{
		"solicitacao_historico",
		"solicitacao_equipamento",
		"anexos",
		"checklists",
		"orcamento_itens",
		"agenda",
		"notas_fiscais",
		"audit_logs",
		"solicitacoes",
		"equipamentos",
		"notificacoes",   // Try to delete if exists
		"refresh_tokens", // Clear sessions
		// "transacoes_financeiras", // Not a real table based on analysis
	}

	log.Println("Starting database cleanup...")

	for _, table := range tables {
		log.Printf("Cleaning table: %s", table)
		// Security Note: Table names are from a static hardcoded list above.
		// This script is for internal maintenance and does not accept user input.
		if err := db.Exec("DELETE FROM " + table).Error; err != nil {
			// Ignore error if table doesn't exist (e.g. notificacoes)
			log.Printf("Warning cleaning %s: %v", table, err)
		} else {
			log.Printf("Successfully cleaned %s", table)
		}
	}

	// Optional: Vacuum to reclaim space
	log.Println("Running VACUUM...")
	db.Exec("VACUUM")

	log.Println("Cleanup finished successfully. Only users and profiles remain.")
}

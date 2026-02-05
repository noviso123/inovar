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

	var solicitacao models.Solicitacao
	// Try finding by ID if Numero fails (user said #1, usually implies Numero)
	if err := db.Where("numero = ?", 1).First(&solicitacao).Error; err != nil {
		log.Printf("Chamado #1 não encontrado pelo Numero: %v", err)
		return
	}

	log.Printf("Found Request #1: ID=%s, Client=%s", solicitacao.ID, solicitacao.ClientName)

	tx := db.Begin()

	// Cascade Delete
	tx.Where("solicitacao_id = ?", solicitacao.ID).Delete(&models.Anexo{})
	tx.Where("solicitacao_id = ?", solicitacao.ID).Delete(&models.Checklist{})
	tx.Where("solicitacao_id = ?", solicitacao.ID).Delete(&models.SolicitacaoHistorico{})
	tx.Where("solicitacao_id = ?", solicitacao.ID).Delete(&models.SolicitacaoEquipamento{})
	tx.Where("solicitacao_id = ?", solicitacao.ID).Delete(&models.OrcamentoItem{})

	if err := tx.Delete(&solicitacao).Error; err != nil {
		tx.Rollback()
		log.Fatalf("Error deleting: %v", err)
	}

	tx.Commit()
	log.Println("✅ Chamado #1 excluído com sucesso.")
}

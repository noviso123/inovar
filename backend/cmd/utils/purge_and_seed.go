package main

import (
	"fmt"
	"log"
	"os"

	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/models"
)

func main() {
	godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "inovar.db"
	}

	fmt.Printf("🧹 Purging and Re-seeding database: %s\n", dbURL)

	var db *gorm.DB
	var err error

	if os.Getenv("FORCE_SUPABASE") == "true" {
		// Try Supabase directly with the known password
		dbURL = "postgres://postgres.bxbupbnjcingfvjszrau:Inovar2025-Admin@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
		fmt.Println("🚀 Attempting Supabase Production Purge...")
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	} else {
		fmt.Println("🏠 Purging LOCAL database...")
		db, err = gorm.Open(sqlite.Open("inovar.db"), &gorm.Config{})
	}

	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}

	// Purge all tables in order
	fmt.Println("🚽 Dropping all data...")
	tables := []interface{}{
		&models.AuditLog{},
		&models.SolicitacaoHistorico{},
		&models.SolicitacaoEquipamento{},
		&models.Checklist{},
		&models.Anexo{},
		&models.Agenda{},
		&models.OrcamentoItem{},
		&models.Expense{},
		&models.NotaFiscal{},
		&models.NFSeEvento{},
		&models.Solicitacao{},
		&models.Equipamento{},
		&models.Cliente{},
		&models.Tecnico{},
		&models.Prestador{},
		&models.RefreshToken{},
		&models.User{},
		&models.Setting{},
		&models.CertificadoDigital{},
		&models.ConfiguracaoFiscal{},
		&models.Endereco{},
	}

	for _, t := range tables {
		db.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(t)
	}

	fmt.Println("✨ Database purged. Running migrations...")
	database.Migrate(db)

	fmt.Println("🌱 Seeding requested users...")
	database.Seed(db)

	fmt.Println("✅ DONE. Database is now clean with only 2 users (admin and clientets).")
}

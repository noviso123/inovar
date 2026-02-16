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
		// Try multiple connection strings for Supabase
		conns := []string{
			"postgres://postgres.bxbupbnjcingfvjszrau:Inovar2025-Admin@aws-0-sa-east-1.pooler.supabase.com:6543/postgres", // Transaction
			"postgres://postgres.bxbupbnjcingfvjszrau:Inovar2025-Admin@aws-0-sa-east-1.pooler.supabase.com:5432/postgres", // Session
			"postgres://postgres:Inovar2025-Admin@db.bxbupbnjcingfvjszrau.supabase.co:5432/postgres?sslmode=require",      // Direct
			"postgres://postgres.bxbupbnjcingfvjszrau:Inovar2025-Admin@db.bxbupbnjcingfvjszrau.supabase.co:5432/postgres", // Direct Ref
			"postgres://postgres:Inovar2025-Admin@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=disable",      // Direct No SSL
		}

		for _, conn := range conns {
			fmt.Printf("🚀 Attempting Supabase connection: %s\n", conn)
			db, err = gorm.Open(postgres.Open(conn), &gorm.Config{})
			if err == nil {
				fmt.Println("✅ Connected to Supabase!")
				break
			}
			fmt.Printf("⚠️  Failed: %v\n", err)
		}
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

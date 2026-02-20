package database

import (
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"inovar/internal/domain"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	// Only create directory if it's likely a local file path
	if !strings.Contains(databaseURL, "://") {
		dbDir := filepath.Dir(databaseURL)
		if dbDir != "" && dbDir != "." {
			if err := os.MkdirAll(dbDir, 0755); err != nil {
				return nil, errors.New("failed to create database directory: " + err.Error())
			}
		}
	}

	log.Printf("📂 Connecting to SQLite database: %s", databaseURL)

	// SQLite with WAL mode for better concurrent read/write performance
	dsn := databaseURL + "?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=ON"

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	// Configure connection pool for SQLite
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1) // SQLite supports only one writer at a time
	sqlDB.SetMaxIdleConns(1)

	log.Println("✅ Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("🔄 Running database migrations...")

	err := db.AutoMigrate(
		&domain.User{},
		&domain.Prestador{},
		&domain.Cliente{},
		&domain.Tecnico{},
		&domain.Endereco{},
		&domain.Equipamento{},
		&domain.Solicitacao{},
		&domain.SolicitacaoEquipamento{},
		&domain.SolicitacaoHistorico{},
		&domain.Checklist{},
		&domain.Anexo{},
		&domain.Agenda{},
		&domain.AuditLog{},
		&domain.Setting{},
		&domain.RefreshToken{},
		&domain.OrcamentoItem{},
		&domain.Expense{},
		&domain.NotaFiscal{},
		&domain.CertificadoDigital{},
		&domain.ConfiguracaoFiscal{},
		&domain.NFSeEvento{},
		&domain.Notification{},
		&domain.CustomQRCode{},
	)

	if err != nil {
		return err
	}

	log.Println("✅ Migrations completed")
	return nil
}

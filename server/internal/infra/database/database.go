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

// BackfillData handles data consistency after schema changes
func BackfillData(db *gorm.DB) {
	log.Println("🔄 Running data backfill...")

	// 1. Backfill CompanyID for Clients that have empty company_id
	// If there's only one Prestador, assign all orphan clients to it
	var prestadorCount int64
	db.Model(&domain.Prestador{}).Count(&prestadorCount)

	if prestadorCount > 0 {
		var prestador domain.Prestador
		db.First(&prestador)

		// Fix clients with no company
		result := db.Exec(`
			UPDATE clientes
			SET company_id = ?
			WHERE company_id IS NULL OR company_id = ''
		`, prestador.ID)
		if result.RowsAffected > 0 {
			log.Printf("✅ Backfilled %d clients with CompanyID=%s", result.RowsAffected, prestador.ID[:8])
		}

		// Fix users with no company (excluding admin)
		result = db.Exec(`
			UPDATE users
			SET company_id = ?
			WHERE (company_id IS NULL OR company_id = '') AND role != 'ADMIN_SISTEMA'
		`, prestador.ID)
		if result.RowsAffected > 0 {
			log.Printf("✅ Backfilled %d users with CompanyID=%s", result.RowsAffected, prestador.ID[:8])
		}
	}

	// 2. Backfill CompanyID for Solicitacoes (Chamados) from their Clients
	result := db.Exec(`
		UPDATE solicitacoes
		SET company_id = (SELECT company_id FROM clientes WHERE clientes.id = solicitacoes.client_id)
		WHERE (company_id IS NULL OR company_id = '') AND client_id IS NOT NULL AND client_id != ''
	`)
	if result.RowsAffected > 0 {
		log.Printf("✅ Backfilled %d solicitacoes (chamados) with CompanyID", result.RowsAffected)
	}

	// 3. Backfill CompanyID for Equipments from their Clients
	result = db.Exec(`
		UPDATE equipamentos
		SET company_id = (SELECT company_id FROM clientes WHERE clientes.id = equipamentos.client_id)
		WHERE (company_id IS NULL OR company_id = '') AND client_id IS NOT NULL AND client_id != ''
	`)
	if result.RowsAffected > 0 {
		log.Printf("✅ Backfilled %d equipments with CompanyID", result.RowsAffected)
	}

	log.Println("✅ Data backfill completed")
}

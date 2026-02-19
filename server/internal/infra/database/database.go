package database

import (
	"errors"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"inovar/internal/domain"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	log.Println("📂 Connecting to Postgres/Supabase...")

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true, // Disables implicit prepared statement usage, mandatory for PgBouncer/Supavisor
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	log.Println("✅ Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("ðŸ”„ Running database migrations...")

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
		&domain.NFSeEvento{}, // NFS-e authorization/cancellation events
	)

	if err != nil {
		return err
	}

	log.Println("âœ… Migrations completed")
	return nil
}

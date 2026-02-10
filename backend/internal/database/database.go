package database

import (
	"log"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/glebarez/sqlite"
	"github.com/inovar/backend/internal/models"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	var dialector gorm.Dialector

	if strings.HasPrefix(databaseURL, "postgres://") || strings.HasPrefix(databaseURL, "postgresql://") {
		log.Println("ðŸ”Œ Connecting to PostgreSQL...")
		dialector = postgres.Open(databaseURL)
	} else {
		log.Println("ðŸ”Œ Connecting to SQLite...")
		dialector = sqlite.Open(databaseURL)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	log.Println("âœ… Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("ðŸ”„ Running database migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.Prestador{},
		&models.Cliente{},
		&models.Tecnico{},
		&models.Endereco{},
		&models.Equipamento{},
		&models.Solicitacao{},
		&models.SolicitacaoEquipamento{},
		&models.SolicitacaoHistorico{},
		&models.Checklist{},
		&models.Anexo{},
		&models.Agenda{},
		&models.AuditLog{},
		&models.Setting{},
		&models.RefreshToken{},
		&models.OrcamentoItem{},
		&models.Expense{},
		&models.NotaFiscal{},
		&models.CertificadoDigital{},
		&models.ConfiguracaoFiscal{},
		&models.NFSeEvento{}, // NFS-e authorization/cancellation events
	)

	if err != nil {
		return err
	}

	log.Println("âœ… Migrations completed")
	return nil
}

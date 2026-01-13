package database

import (
	"log"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/glebarez/sqlite"
	"github.com/inovar/backend/internal/models"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	log.Println("✅ Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("🔄 Running database migrations...")

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
		&models.NotaFiscal{},
		&models.CertificadoDigital{},
		&models.ConfiguracaoFiscal{},
	)

	if err != nil {
		return err
	}

	log.Println("✅ Migrations completed")
	return nil
}

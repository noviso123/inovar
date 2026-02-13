package main

import (
	"fmt"

	"github.com/inovar/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type sqlWriter struct{}

func (s *sqlWriter) Printf(format string, v ...interface{}) {
	fmt.Printf(format, v...)
	fmt.Println()
}

func main() {
	// Custom logger to capture SQL
	newLogger := logger.New(
		&sqlWriter{},
		logger.Config{
			LogLevel: logger.Info,
		},
	)

	dialector := postgres.New(postgres.Config{
		DSN: "host=localhost user=gorm password=gorm dbname=gorm port=9920 sslmode=disable TimeZone=Asia/Shanghai",
	})

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: newLogger,
		DryRun: true,
	})
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Println("-- START SCHEMA GENERATION --")

	// Create tables
	modelsList := []interface{}{
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
		&models.NFSeEvento{},
	}

	for _, m := range modelsList {
		err = db.AutoMigrate(m)
		if err != nil {
			fmt.Printf("Error during migration of %T: %v\n", m, err)
		}
	}

	fmt.Println("-- END SCHEMA GENERATION --")
}

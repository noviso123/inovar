package database

import (
	"log"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"inovar/internal/domain"
)

// Connect initializes the GORM database connection
func Connect(dbURL string) (*gorm.DB, error) {
	if dbURL == "" {
		dbURL = "inovar.db"
	}

	// Configure GORM logger
	newLogger := logger.New(
		log.Default(),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(sqlite.Open(dbURL), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		return nil, err
	}

	// Optimize SQLite for concurrent access
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(1) // Better for SQLite to avoid "database is locked"
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(time.Hour)

		// Enable WAL mode and foreign keys
		db.Exec("PRAGMA journal_mode = WAL;")
		db.Exec("PRAGMA foreign_keys = ON;")
	}

	log.Println("📦 Database connection established")

	// Auto-migrate models
	err = db.AutoMigrate(
		&domain.User{},
		&domain.Cliente{},
		&domain.Endereco{},
		&domain.Equipamento{},
		&domain.Solicitacao{},
		&domain.Anexo{},
		&domain.SolicitacaoHistorico{},
		&domain.Prestador{},
		&domain.Checklist{},
		&domain.SolicitacaoEquipamento{},
		&domain.Agenda{},
		&domain.Notification{},
		&domain.CustomQRCode{},
		&domain.OrcamentoItem{},
		&domain.NotaFiscal{},
		&domain.CertificadoDigital{},
		&domain.ConfiguracaoFiscal{},
		&domain.NFSeEvento{},
		&domain.Expense{},
		&domain.Tecnico{},
		&domain.AuditLog{},
		&domain.Setting{},
		&domain.RefreshToken{},
	)
	if err != nil {
		log.Printf("⚠️ AutoMigrate warning: %v", err)
	} else {
		log.Println("✅ Database schema migrated")
	}

	// Initialize default data
	initializeDefaultData(db)

	return db, nil
}

// initializeDefaultData creates default admin user and company if they don't exist
func initializeDefaultData(db *gorm.DB) {
	// Check if admin user exists
	var adminCount int64
	db.Model(&domain.User{}).Where("role = ?", domain.RoleAdmin).Count(&adminCount)

	if adminCount == 0 {
		log.Println("👤 Creating default admin user...")

		// Create admin user
		adminID := uuid.New().String()
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

		admin := domain.User{
			ID:                 adminID,
			Name:               "Administrador do Sistema",
			Email:              "admin@inovar.com",
			PasswordHash:       string(hashedPassword),
			Role:               domain.RoleAdmin,
			Active:             true,
			MustChangePassword: true,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if err := db.Create(&admin).Error; err != nil {
			log.Printf("❌ Failed to create admin user: %v", err)
		} else {
			log.Println("✅ Default admin user created successfully")
			log.Println("   📧 Email: admin@inovar.com")
			log.Println("   🔑 Password: 123456")
		}

		// Create default prestador (company)
		prestadorID := uuid.New().String()
		prestador := domain.Prestador{
			ID:           prestadorID,
			UserID:       adminID,
			RazaoSocial:  "Inovar Climatização",
			NomeFantasia: "Inovar",
			Email:        "contato@inovar.com",
			Phone:        "(00) 00000-0000",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := db.Create(&prestador).Error; err != nil {
			log.Printf("❌ Failed to create default company: %v", err)
		} else {
			// Update admin's company ID
			db.Model(&domain.User{}).Where("id = ?", adminID).Update("company_id", prestadorID)
			log.Println("✅ Default company created successfully")
		}
	}

	// Initialize default settings if they don't exist
	var settingsCount int64
	db.Model(&domain.Setting{}).Count(&settingsCount)

	if settingsCount == 0 {
		log.Println("⚙️ Creating default system settings...")
		defaultSettings := []domain.Setting{
			{Key: "sla_baixa", Value: "72", Description: "SLA para prioridade baixa (horas)"},
			{Key: "sla_media", Value: "48", Description: "SLA para prioridade média (horas)"},
			{Key: "sla_alta", Value: "24", Description: "SLA para prioridade alta (horas)"},
			{Key: "sla_emergencial", Value: "6", Description: "SLA para prioridade emergencial (horas)"},
			{Key: "lock_timeout", Value: "300", Description: "Timeout de bloqueio de edição (segundos)"},
			{Key: "confirm_days", Value: "7", Description: "Dias para confirmação do cliente"},
			{Key: "preventive_interval", Value: "90", Description: "Intervalo padrão para preventivas (dias)"},
		}

		for _, setting := range defaultSettings {
			db.Create(&setting)
		}
		log.Println("✅ Default settings created")
	}
}

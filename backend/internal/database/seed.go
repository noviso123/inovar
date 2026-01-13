package database

import (
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/inovar/backend/internal/models"
)

func Seed(db *gorm.DB) {
	// Check if already seeded
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		log.Println("📦 Database already seeded, skipping...")
		return
	}

	log.Println("🌱 Seeding initial data...")

	// Hash password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	// Create Admin
	admin := models.User{
		ID:           uuid.New().String(),
		Name:         "Admin Inovar",
		Email:        "admin@inovar.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAdmin,
		Phone:        "(11) 99999-0000",
		Active:       true,
		CreatedAt:    time.Now(),
	}
	db.Create(&admin)

	// Create Prestador
	prestadorUser := models.User{
		ID:           uuid.New().String(),
		Name:         "Clima Master Ltda",
		Email:        "contato@climamaster.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RolePrestador,
		Phone:        "(11) 3333-4444",
		Active:       true,
		CreatedAt:    time.Now(),
	}
	db.Create(&prestadorUser)

	prestador := models.Prestador{
		ID:          uuid.New().String(),
		UserID:      prestadorUser.ID,
		RazaoSocial: "Clima Master Serviços de Refrigeração Ltda",
		NomeFantasia: "Clima Master",
		CNPJ:        "12.345.678/0001-90",
		Email:       "contato@climamaster.com",
		Phone:       "(11) 3333-4444",
	}
	db.Create(&prestador)

	// Create Technician
	tecnico := models.User{
		ID:           uuid.New().String(),
		Name:         "Ricardo Técnico",
		Email:        "ricardo@tecnico.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleTecnico,
		Phone:        "(11) 97777-8888",
		Active:       true,
		CompanyID:    &prestador.ID,
		CreatedAt:    time.Now(),
	}
	db.Create(&tecnico)

	// Create Client
	clienteUser := models.User{
		ID:           uuid.New().String(),
		Name:         "Condomínio Parque Real",
		Email:        "solar@cliente.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleCliente,
		Phone:        "(11) 2222-3333",
		Active:       true,
		CompanyID:    &prestador.ID,
		CreatedAt:    time.Now(),
	}
	db.Create(&clienteUser)

	cliente := models.Cliente{
		ID:        uuid.New().String(),
		UserID:    clienteUser.ID,
		Name:      "Condomínio Parque Real",
		Document:  "12.345.678/0001-99",
		Email:     "solar@cliente.com",
		Phone:     "(11) 2222-3333",
		CompanyID: prestador.ID,
	}
	db.Create(&cliente)

	// Create Equipments
	equipamentos := []models.Equipamento{
		{
			ID:        uuid.New().String(),
			ClientID:  cliente.ID,
			Brand:     "Samsung",
			Model:     "WindFree Inverter",
			BTU:       12000,
			Location:  "Portaria Principal",
			Active:    true,
			CreatedAt: time.Now(),
		},
		{
			ID:        uuid.New().String(),
			ClientID:  cliente.ID,
			Brand:     "LG",
			Model:     "Dual Inverter ArtCool",
			BTU:       18000,
			Location:  "Salão de Festas",
			Active:    true,
			CreatedAt: time.Now(),
		},
		{
			ID:        uuid.New().String(),
			ClientID:  cliente.ID,
			Brand:     "Carrier",
			Model:     "Piso Teto",
			BTU:       48000,
			Location:  "Academia 2º Andar",
			Active:    true,
			CreatedAt: time.Now(),
		},
	}
	for _, eq := range equipamentos {
		db.Create(&eq)
	}

	// Default settings
	settings := []models.Setting{
		{Key: "sla_baixa", Value: "72", Description: "SLA em horas para prioridade Baixa"},
		{Key: "sla_media", Value: "48", Description: "SLA em horas para prioridade Média"},
		{Key: "sla_alta", Value: "24", Description: "SLA em horas para prioridade Alta"},
		{Key: "sla_emergencial", Value: "6", Description: "SLA em horas para prioridade Emergencial"},
		{Key: "lock_timeout", Value: "300", Description: "Timeout de lock em segundos"},
		{Key: "confirm_days", Value: "7", Description: "Dias para confirmação do cliente"},
	}
	for _, s := range settings {
		db.Create(&s)
	}

	// Create additional demo users with standard emails
	// These match the demo buttons in the frontend
	demoPrestador := models.User{
		ID:           uuid.New().String(),
		Name:         "Prestador Demo",
		Email:        "prestador@inovar.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RolePrestador,
		Phone:        "(11) 91111-2222",
		Active:       true,
		CreatedAt:    time.Now(),
	}
	db.Create(&demoPrestador)

	demoPrestadorCompany := models.Prestador{
		ID:           uuid.New().String(),
		UserID:       demoPrestador.ID,
		RazaoSocial:  "Prestador Demo Ltda",
		NomeFantasia: "Prestador Demo",
		CNPJ:         "00.000.000/0001-00",
		Email:        "prestador@inovar.com",
		Phone:        "(11) 91111-2222",
	}
	db.Create(&demoPrestadorCompany)
	// Update user with company ID
	db.Model(&demoPrestador).Update("company_id", demoPrestadorCompany.ID)

	demoTecnico := models.User{
		ID:           uuid.New().String(),
		Name:         "Técnico Demo",
		Email:        "tecnico@inovar.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleTecnico,
		Phone:        "(11) 93333-4444",
		Active:       true,
		CompanyID:    &demoPrestadorCompany.ID,
		CreatedAt:    time.Now(),
	}
	db.Create(&demoTecnico)

	demoClienteUser := models.User{
		ID:           uuid.New().String(),
		Name:         "Cliente Demo",
		Email:        "cliente@inovar.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleCliente,
		Phone:        "(11) 95555-6666",
		Active:       true,
		CompanyID:    &demoPrestadorCompany.ID,
		CreatedAt:    time.Now(),
	}
	db.Create(&demoClienteUser)

	demoCliente := models.Cliente{
		ID:        uuid.New().String(),
		UserID:    demoClienteUser.ID,
		Name:      "Cliente Demo",
		Document:  "000.000.000-00",
		Email:     "cliente@inovar.com",
		Phone:     "(11) 95555-6666",
		CompanyID: demoPrestadorCompany.ID,
	}
	db.Create(&demoCliente)

	log.Println("✅ Seed completed")
}

package domain

import (
	"time"

	"gorm.io/gorm"
)

// Prestador represents the Service Provider (The Company using the system)
type Prestador struct {
	ID           string `gorm:"primaryKey;size:36" json:"id"`
	UserID       string `gorm:"size:36;uniqueIndex;not null" json:"userId"` // Admin user who manages this company
	RazaoSocial  string `gorm:"size:255;not null" json:"razaoSocial"`
	NomeFantasia string `gorm:"size:255" json:"nomeFantasia"`
	CNPJ         string `gorm:"size:20;uniqueIndex" json:"cnpj"`
	Email        string `gorm:"size:255" json:"email"`
	Phone        string `gorm:"size:20" json:"phone"`
	Address      string `gorm:"size:500" json:"address"` // Formatted address string
	LogoURL      string `gorm:"size:500" json:"logoUrl,omitempty"`

	// Address
	EnderecoID *string   `gorm:"size:36" json:"enderecoId,omitempty"`
	Endereco   *Endereco `gorm:"foreignKey:EnderecoID" json:"endereco,omitempty"`

	// Financial
	BankDetails string `gorm:"size:500" json:"bankDetails,omitempty"`
	PixKey      string `gorm:"size:255" json:"pixKey,omitempty"`
	PixKeyType  string `gorm:"size:50" json:"pixKeyType,omitempty"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Prestador) TableName() string { return "prestadores" }

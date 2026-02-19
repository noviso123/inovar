package domain

import "time"

// Prestador represents a service provider company
type Prestador struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	UserID       string    `gorm:"size:36;uniqueIndex;not null" json:"userId"`
	RazaoSocial  string    `gorm:"size:255;not null" json:"razaoSocial"`
	NomeFantasia string    `gorm:"size:255" json:"nomeFantasia"`
	CNPJ         string    `gorm:"size:20;uniqueIndex" json:"cnpj"`
	Email        string    `gorm:"size:255" json:"email"`
	Phone        string    `gorm:"size:20" json:"phone"`
	Address      string    `gorm:"size:500" json:"address"`
	EnderecoID   *string   `gorm:"size:36" json:"enderecoId,omitempty"`
	LogoURL      string    `gorm:"size:500" json:"logoUrl,omitempty"`
	BankDetails  string    `gorm:"type:text" json:"bankDetails,omitempty"`
	PixKey       string    `gorm:"size:255" json:"pixKey,omitempty"`
	PixKeyType   string    `gorm:"size:50" json:"pixKeyType,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	User     User      `gorm:"foreignKey:UserID" json:"-"`
	Endereco *Endereco `gorm:"foreignKey:EnderecoID" json:"endereco,omitempty"`
}

func (Prestador) TableName() string { return "prestadores" }

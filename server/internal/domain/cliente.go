package domain

import (
	"time"

	"gorm.io/gorm"
)

// Cliente represents a client
type Cliente struct {
	ID         string         `gorm:"primaryKey;size:36" json:"id"`
	UserID     string         `gorm:"size:36;uniqueIndex;not null" json:"userId"`
	Name       string         `gorm:"size:255;not null" json:"name"`
	Document   string         `gorm:"size:20" json:"document,omitempty"`
	Email      string         `gorm:"size:255" json:"email"`
	Phone      string         `gorm:"size:20" json:"phone,omitempty"`
	EnderecoID *string        `gorm:"size:36" json:"enderecoId,omitempty"`
	CompanyID  string         `gorm:"size:36;not null;index" json:"companyId"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	Active bool `gorm:"default:true" json:"active"`

	User     User      `gorm:"foreignKey:UserID" json:"-"`
	Endereco *Endereco `gorm:"foreignKey:EnderecoID" json:"endereco,omitempty"`
}

func (Cliente) TableName() string { return "clientes" }

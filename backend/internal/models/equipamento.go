package models

import (
	"time"

	"gorm.io/gorm"
)

// Equipamento represents an air conditioning unit
type Equipamento struct {
	ID           string         `gorm:"primaryKey;size:36" json:"id"`
	ClientID     string         `gorm:"size:36;not null;index" json:"clientId"`
	Brand        string         `gorm:"size:100;not null" json:"brand"`
	Model        string         `gorm:"size:100;not null" json:"model"`
	BTU          int            `gorm:"not null" json:"btu"`
	SerialNumber string         `gorm:"size:100" json:"serialNumber,omitempty"`
	Location     string         `gorm:"size:255;not null" json:"location"`
	Active       bool           `gorm:"default:true;index" json:"active"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	Client Cliente `gorm:"foreignKey:ClientID" json:"-"`
}

func (Equipamento) TableName() string { return "equipamentos" }

package domain

import (
	"time"

	"gorm.io/gorm"
)

type CustomQRCode struct {
	ID             string         `gorm:"primaryKey;size:36" json:"id"`
	CompanyID      string         `gorm:"size:36;not null;index" json:"companyId"`
	Type           string         `gorm:"size:20;not null" json:"type"` // whatsapp, instagram, url, wifi, text
	Title          string         `gorm:"size:100;not null" json:"title"`
	Subtitle       string         `gorm:"size:100" json:"subtitle"`
	FooterMessage  string         `gorm:"size:255" json:"footerMessage"`
	PrimaryColor   string         `gorm:"size:20;default:'#2563eb'" json:"primaryColor"`
	SecondaryColor string         `gorm:"size:20;default:'#f8fafc'" json:"secondaryColor"`
	LogoUrl        string         `gorm:"size:500" json:"logoUrl"`
	LayoutType     string         `gorm:"size:20;default:'marketing'" json:"layoutType"`
	Content        string         `gorm:"size:255" json:"content"`
	Value          string         `gorm:"size:500;not null" json:"value"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (CustomQRCode) TableName() string { return "custom_qr_codes" }

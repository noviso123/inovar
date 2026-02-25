package domain

import (
	"time"

	"gorm.io/gorm"
)

// Anexo represents an attachment
type Anexo struct {
	ID             string         `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID  string         `gorm:"size:36;not null;index" json:"solicitacaoId"`
	FileName       string         `gorm:"size:255;not null" json:"fileName"`
	FilePath       string         `gorm:"size:500;not null" json:"filePath"`
	MimeType       string         `gorm:"size:100" json:"mimeType"`
	FileSize       int64          `json:"fileSize"`
	UploadedByID   string         `gorm:"size:36;not null" json:"uploadedById"`
	UploadedByName string         `gorm:"size:255" json:"uploadedByName"`
	CreatedAt      time.Time      `json:"createdAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Anexo) TableName() string { return "anexos" }

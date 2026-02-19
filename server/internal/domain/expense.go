package domain

import (
	"time"
)

// Expense tracks operational costs related to services or general company expenses
type Expense struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID *string   `gorm:"size:36;index" json:"solicitacaoId,omitempty"` // Optional: linked to a specific OS
	Category      string    `gorm:"size:50;not null" json:"category"`             // e.g., "PART", "TRAVEL", "TOOL", "TAX"
	Description   string    `gorm:"size:255;not null" json:"description"`
	Amount        float64   `gorm:"not null" json:"amount"`
	Date          time.Time `gorm:"not null" json:"date"`
	Paid          bool      `gorm:"default:false" json:"paid"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (Expense) TableName() string { return "expenses" }

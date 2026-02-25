package domain

import "time"

// Checklist represents a checklist item
type Checklist struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID string    `gorm:"size:36;not null;index" json:"solicitacaoId"`
	EquipamentoID *string   `gorm:"size:36;index" json:"equipamentoId,omitempty"`
	Description   string    `gorm:"size:255;not null" json:"description"`
	Checked       bool      `gorm:"default:false" json:"checked"`
	Observation   string    `gorm:"type:text" json:"observation,omitempty"`
	CheckedByID   *string   `gorm:"size:36" json:"checkedById,omitempty"`
	CheckedByName string    `gorm:"size:255" json:"checkedByName,omitempty"`
	CheckedAt     *time.Time `json:"checkedAt,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (Checklist) TableName() string { return "checklists" }

package domain

import "time"

// SolicitacaoHistorico stores immutable history
type SolicitacaoHistorico struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID string    `gorm:"size:36;not null;index" json:"solicitacaoId"`
	UserID        string    `gorm:"size:36;not null" json:"userId"`
	UserName      string    `gorm:"size:255;not null" json:"userName"`
	Action        string    `gorm:"size:100;not null" json:"action"`
	Details       string    `gorm:"type:text" json:"details,omitempty"`
	BeforeValue   string    `gorm:"type:text" json:"beforeValue,omitempty"`
	AfterValue    string    `gorm:"type:text" json:"afterValue,omitempty"`
	CreatedAt     time.Time `json:"timestamp"`
}

func (SolicitacaoHistorico) TableName() string { return "solicitacao_historico" }

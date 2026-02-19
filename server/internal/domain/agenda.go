package domain

import "time"

// Agenda represents a schedule entry
type Agenda struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	UserID        string    `gorm:"size:36;not null;index" json:"userId"`
	SolicitacaoID string    `gorm:"size:36;not null;index" json:"solicitacaoId"`
	Title         string    `gorm:"size:255;not null" json:"title"`
	ScheduledAt   time.Time `gorm:"not null" json:"scheduledAt"`
	Duration      int       `gorm:"default:60" json:"duration"` // in minutes
	Notes         string    `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`

	User        User        `gorm:"foreignKey:UserID" json:"-"`
	Solicitacao Solicitacao `gorm:"foreignKey:SolicitacaoID" json:"-"`
}

func (Agenda) TableName() string { return "agenda" }

package domain

import (
	"time"
)

// Notification represents a system notification for a user
type Notification struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"userId" gorm:"index;not null"`
	Title     string    `json:"title" gorm:"not null"`
	Message   string    `json:"message" gorm:"type:text;not null"`
	Read      bool      `json:"read" gorm:"default:false"`
	Type      string    `json:"type" gorm:"default:'INFO'"` // INFO, WARNING, SUCCESS, ERROR
	Link      string    `json:"link,omitempty"`             // Optional link to redirect user
	CreatedAt time.Time `json:"createdAt"`
}

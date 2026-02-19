package domain

import (
	"time"
)

// AuditLog stores all system actions for auditing
type AuditLog struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	UserID      string    `gorm:"size:36;not null;index" json:"userId"`
	UserName    string    `gorm:"size:255;not null" json:"userName"`
	UserRole    string    `gorm:"size:50" json:"userRole"`
	Entity      string    `gorm:"size:50;not null;index" json:"entity"`
	EntityID    string    `gorm:"size:36;index" json:"entityId"`
	Action      string    `gorm:"size:100;not null" json:"action"`
	Details     string    `gorm:"type:text" json:"details,omitempty"`
	BeforeValue string    `gorm:"type:text" json:"beforeValue,omitempty"`
	AfterValue  string    `gorm:"type:text" json:"afterValue,omitempty"`
	IPAddress   string    `gorm:"size:45" json:"ipAddress,omitempty"`
	UserAgent   string    `gorm:"size:500" json:"userAgent,omitempty"`
	CreatedAt   time.Time `gorm:"index" json:"timestamp"`
}

// Setting stores system configuration
type Setting struct {
	Key         string `gorm:"primaryKey;size:100" json:"key"`
	Value       string `gorm:"type:text;not null" json:"value"`
	Description string `gorm:"size:255" json:"description,omitempty"`
}

// RefreshToken stores refresh tokens for JWT
type RefreshToken struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	UserID    string    `gorm:"size:36;not null;index" json:"userId"`
	Token     string    `gorm:"size:255;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time `gorm:"not null" json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
	Revoked   bool      `gorm:"default:false" json:"revoked"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides
func (AuditLog) TableName() string     { return "audit_logs" }
func (Setting) TableName() string      { return "settings" }
func (RefreshToken) TableName() string { return "refresh_tokens" }

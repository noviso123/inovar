package domain

import (
	"time"

	"gorm.io/gorm"
)

// User represents a system user
type User struct {
	ID                  string         `gorm:"primaryKey;size:36" json:"id"`
	Name                string         `gorm:"size:255;not null" json:"name"`
	Email               string         `gorm:"size:255;uniqueIndex;not null" json:"email"`
	PasswordHash        string         `gorm:"size:255;not null" json:"-"`
	Role                string         `gorm:"size:50;not null;index" json:"role"`
	Phone               string         `gorm:"size:20" json:"phone,omitempty"`
	Active              bool           `gorm:"default:true;index" json:"active"`
	MustChangePassword  bool           `gorm:"default:true" json:"mustChangePassword"`
	CompanyID           *string        `gorm:"size:36;index" json:"companyId,omitempty"`
	AvatarURL           string         `gorm:"size:500" json:"avatarUrl,omitempty"`
	ResetToken          *string        `gorm:"size:255;index" json:"-"`
	ResetTokenExpiresAt *time.Time     `json:"-"`
	CreatedAt           time.Time      `json:"createdAt"`
	UpdatedAt           time.Time      `json:"updatedAt"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string { return "users" }

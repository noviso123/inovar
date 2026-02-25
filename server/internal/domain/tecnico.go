package domain

import "time"

// Tecnico represents a technician
type Tecnico struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	UserID      string    `gorm:"size:36;uniqueIndex;not null" json:"userId"`
	CompanyID   string    `gorm:"size:36;not null;index" json:"companyId"`
	Specialties string    `gorm:"size:500" json:"specialties,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	User    User      `gorm:"foreignKey:UserID" json:"-"`
	Company Prestador `gorm:"foreignKey:CompanyID" json:"-"`
}

func (Tecnico) TableName() string { return "tecnicos" }

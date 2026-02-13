package shared

import (
	"time"
)

// User model
type User struct {
	ID                 uint      `json:"id" gorm:"primaryKey"`
	Name               string    `json:"name"`
	Email              string    `json:"email" gorm:"unique;not null"`
	PasswordHash       string    `json:"-" gorm:"column:password_hash"`
	Role               string    `json:"role"` // admin, manager, technician
	CompanyID          *uint     `json:"companyId" gorm:"column:company_id"`
	Active             bool      `json:"active" gorm:"default:true"`
	MustChangePassword bool      `json:"mustChangePassword" gorm:"column:must_change_password;default:false"`
	AvatarURL          *string   `json:"avatarUrl" gorm:"column:avatar_url"`
	Phone              *string   `json:"phone"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// Client model
type Client struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	CNPJ      string    `json:"cnpj" gorm:"unique"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Address   string    `json:"address"`
	CompanyID uint      `json:"companyId" gorm:"column:company_id"`
	Active    bool      `json:"active" gorm:"default:true"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Request model (Service Request)
type Request struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	Status      string    `json:"status" gorm:"default:pending"` // pending, in_progress, completed
	Priority    string    `json:"priority"`                      // low, medium, high
	ClientID    uint      `json:"clientId" gorm:"column:client_id"`
	CompanyID   uint      `json:"companyId" gorm:"column:company_id"`
	CreatedBy   uint      `json:"createdBy" gorm:"column:created_by"`
	AssignedTo  *uint     `json:"assignedTo" gorm:"column:assigned_to"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

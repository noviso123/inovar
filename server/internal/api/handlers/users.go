package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
)

// ListUsers returns all users based on role
func (h *Handler) ListUsers(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)

	var users []domain.User
	query := h.DB

	if role != domain.RoleAdmin {
		query = query.Where("company_id = ?", companyID)
	}

	if err := query.Find(&users).Error; err != nil {
		return ServerError(c, err)
	}

	return Success(c, users)
}

// CreateUserRequest represents user creation payload
type CreateUserRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	Phone       string `json:"phone"`
	CompanyID   string `json:"companyId"`
	AvatarURL   string `json:"avatarUrl"`
	Specialties string `json:"specialties"`
}

// CreateUser creates a new user
func (h *Handler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Hash password
	password := req.Password
	if password == "" {
		password = h.Config.DefaultPassword
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// Set company ID for non-admin creators
	companyID := req.CompanyID
	creatorRole := middleware.GetUserRole(c)
	if creatorRole != domain.RoleAdmin || companyID == "" {
		// If Admin didn't provide one, or if it's not an Admin, get the companyID from token or default
		companyID = middleware.GetCompanyID(c)
		if companyID == "" {
			// Get default company if still empty
			h.DB.Table("prestadores").Select("id").Limit(1).Scan(&companyID)
		}
	}

	userId := uuid.New().String()
	user := domain.User{
		ID:                 userId,
		Name:               req.Name,
		Email:              req.Email,
		PasswordHash:       string(hashedPassword),
		Role:               req.Role,
		Phone:              req.Phone,
		Active:             true,
		AvatarURL:          req.AvatarURL,
		MustChangePassword: true,
	}

	if companyID != "" {
		user.CompanyID = &companyID
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// If it's a technician, also create technician entry
	if req.Role == domain.RoleTecnico {
		tecnico := domain.Tecnico{
			ID:          uuid.New().String(),
			UserID:      userId,
			CompanyID:   companyID,
			Specialties: req.Specialties,
		}
		h.DB.Create(&tecnico)
	}

	h.Hub.Broadcast("user:created", user)

	// Send Notifications (Email)
	go func() {
		if h.EmailService != nil && req.Email != "" {
			h.EmailService.SendWelcomeEmail(req.Email, req.Name, password)
		}
	}()

	return Created(c, user)
}

// GetUser returns a specific user
func (h *Handler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, user)
}

// UpdateUser updates a user
func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	before := user

	user.Name = req.Name
	user.Email = req.Email
	user.Phone = req.Phone
	user.AvatarURL = req.AvatarURL
	user.Role = req.Role

	if req.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		user.PasswordHash = string(hashedPassword)
	}

	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// Update technician if exists
	if user.Role == domain.RoleTecnico {
		var tecnico domain.Tecnico
		if err := h.DB.Where("user_id = ?", user.ID).First(&tecnico).Error; err == nil {
			tecnico.Specialties = req.Specialties
			h.DB.Save(&tecnico)
		}
	}

	h.Hub.Broadcast("user:updated", user)

	// Final Audit
	h.LogAudit(c, "User", id, "UPDATE", fmt.Sprintf("Updated user %s", req.Email), before, user)

	return Success(c, user)
}

// BlockUser blocks or unblocks a user
func (h *Handler) BlockUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	user.Active = !user.Active
	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("user:updated", user)

	return Success(c, user)
}

// AdminResetPassword resets user password (admin only)
func (h *Handler) AdminResetPassword(c *fiber.Ctx) error {
	id := c.Params("id")

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Generate temporary password
	tempPassword := "123456"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)

	user.PasswordHash = string(hashedPassword)
	user.MustChangePassword = true
	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// Send email with new temporary password
	go func() {
		if h.EmailService != nil && user.Email != "" {
			h.EmailService.SendPasswordResetByAdmin(user.Email, user.Name, tempPassword)
		}
	}()

	return Success(c, fiber.Map{
		"message":      "Senha resetada com sucesso",
		"tempPassword": tempPassword,
	})
}

// DeleteUser permanently deletes a user (admin only)
func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.DB.Delete(&domain.User{}, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Also delete dependencies like technico
	h.DB.Delete(&domain.Tecnico{}, "user_id = ?", id)
	h.DB.Delete(&domain.RefreshToken{}, "user_id = ?", id)

	// Broadcast event
	h.Hub.Broadcast("user:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Usuário excluído permanentemente"})
}

// GetCompany returns the company profile for the authenticated admin
func (h *Handler) GetCompany(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// In the new structure, we assume the Admin manages the Company profile.
	// We'll use a generic search or the first company found if none linked specifically to userId.
	var company struct {
		ID           string `json:"id"`
		RazaoSocial  string `json:"razaoSocial"`
		NomeFantasia string `json:"nomeFantasia"`
		CNPJ         string `json:"cnpj"`
		Email        string `json:"email"`
		Phone        string `json:"phone"`
		Address      string `json:"address"`
		LogoURL      string `json:"logoUrl"`
	}

	result := h.DB.Table("prestadores").Where("user_id = ?", userID).First(&company)
	if result.Error != nil {
		// Fallback to first company if this is a single-tenant setup
		h.DB.Table("prestadores").First(&company)
	}

	return Success(c, company)
}

// UpdateCompanyRequest represents company update payload
type UpdateCompanyRequest struct {
	RazaoSocial  string                 `json:"razaoSocial"`
	NomeFantasia string                 `json:"nomeFantasia"`
	CNPJ         string                 `json:"cnpj"`
	Email        string                 `json:"email"`
	Phone        string                 `json:"phone"`
	Address      string                 `json:"address"`
	BankDetails  string                 `json:"bankDetails"`
	PixKey       string                 `json:"pixKey"`
	PixKeyType   string                 `json:"pixKeyType"`
	LogoURL      string                 `json:"logoUrl"`
	Endereco     *CreateEnderecoRequest `json:"endereco,omitempty"`
}

// UpdateCompany updates the company profile
func (h *Handler) UpdateCompany(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req UpdateCompanyRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var prestador domain.Prestador
	err := h.DB.Where("user_id = ?", userID).First(&prestador).Error
	isNew := err != nil

	if isNew {
		prestador.ID = uuid.New().String()
		prestador.UserID = userID
	}

	prestador.RazaoSocial = req.RazaoSocial
	prestador.NomeFantasia = req.NomeFantasia
	prestador.CNPJ = req.CNPJ
	prestador.Email = req.Email
	prestador.Phone = req.Phone
	prestador.BankDetails = req.BankDetails
	prestador.PixKey = req.PixKey
	prestador.PixKeyType = req.PixKeyType
	prestador.LogoURL = req.LogoURL

	if isNew {
		if err := h.DB.Create(&prestador).Error; err != nil {
			return ServerError(c, err)
		}
		// Link user to company
		h.DB.Model(&domain.User{}).Where("id = ?", userID).Update("company_id", prestador.ID)
	} else {
		if err := h.DB.Save(&prestador).Error; err != nil {
			return ServerError(c, err)
		}
	}

	return Success(c, prestador)
}

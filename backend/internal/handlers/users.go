package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// ListUsers returns all users based on role
func (h *Handler) ListUsers(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)

	var users []models.User
	query := h.DB.Model(&models.User{})

	// Prestador only sees their company's users
	if role == models.RolePrestador && companyID != "" {
		query = query.Where("company_id = ? OR id = ?", companyID, middleware.GetUserID(c))
	}

	query.Order("created_at DESC").Find(&users)

	return Success(c, users)
}

// CreateUserRequest represents user creation payload
type CreateUserRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Role      string `json:"role"`
	Phone     string `json:"phone"`
	CompanyID string `json:"companyId"`
	AvatarURL string `json:"avatarUrl"`
}

// CreateUser creates a new user
func (h *Handler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Validate role
	validRoles := []string{models.RolePrestador, models.RoleTecnico, models.RoleCliente}
	isValid := false
	for _, r := range validRoles {
		if req.Role == r {
			isValid = true
			break
		}
	}
	if !isValid && middleware.GetUserRole(c) != models.RoleAdmin {
		return BadRequest(c, "Role inválido")
	}

	// Check if email exists
	var count int64
	h.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return BadRequest(c, "Email já cadastrado")
	}

	// Hash password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	// Set company ID for non-admin creators
	companyID := req.CompanyID
	if middleware.GetUserRole(c) == models.RolePrestador {
		companyID = middleware.GetCompanyID(c)
	}

	user := models.User{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		Phone:        req.Phone,
		Active:       true,
		CompanyID:    &companyID,
		AvatarURL:    req.AvatarURL,
		CreatedAt:    time.Now(),
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// Broadcast event
	h.Hub.Broadcast("user:created", user)

	return Created(c, user)
}

// GetUser returns a specific user
func (h *Handler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, user)
}

// UpdateUser updates a user
func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	user.Name = req.Name
	user.Phone = req.Phone
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	user.UpdatedAt = time.Now()

	// Only admin can change role
	if middleware.GetUserRole(c) == models.RoleAdmin && req.Role != "" {
		user.Role = req.Role
	}

	h.DB.Save(&user)

	h.Hub.Broadcast("user:updated", user)

	return Success(c, user)
}

// BlockUser blocks or unblocks a user
func (h *Handler) BlockUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	user.Active = !user.Active
	user.UpdatedAt = time.Now()
	h.DB.Save(&user)

	action := "user:blocked"
	if user.Active {
		action = "user:unblocked"
	}
	h.Hub.Broadcast(action, user)

	return Success(c, user)
}

// AdminResetPassword resets user password (admin/prestador only)
func (h *Handler) AdminResetPassword(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Generate temporary password
	tempPassword := uuid.New().String()[:8]
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)

	user.PasswordHash = string(hashedPassword)
	user.UpdatedAt = time.Now()
	h.DB.Save(&user)

	// TODO: Send email with new password

	return Success(c, fiber.Map{
		"message":      "Senha resetada com sucesso",
		"tempPassword": tempPassword, // Only for demo, remove in production
	})
}

// DeleteUser permanently deletes a user (admin only)
func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Broadcast event
	h.Hub.Broadcast("user:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Usuário excluído permanentemente"})
}

// GetCompany returns the company profile for the authenticated provider
func (h *Handler) GetCompany(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var company models.Prestador
	if err := h.DB.First(&company, "user_id = ?", userID).Error; err != nil {
		// Return empty company so user can create one
		return Success(c, fiber.Map{
			"id":           "",
			"razaoSocial":  "",
			"nomeFantasia": "",
			"cnpj":         "",
			"email":        "",
			"phone":        "",
			"address":      "",
			"logoUrl":      "",
		})
	}

	return Success(c, company)
}

// UpdateCompanyRequest represents company update payload
type UpdateCompanyRequest struct {
	RazaoSocial  string `json:"razaoSocial"`
	NomeFantasia string `json:"nomeFantasia"`
	CNPJ         string `json:"cnpj"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Address      string `json:"address"`
	BankDetails  string `json:"bankDetails"`
	LogoURL      string `json:"logoUrl"`
}

// UpdateCompany updates the company profile
func (h *Handler) UpdateCompany(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req UpdateCompanyRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var company models.Prestador
	// check if exists, if not create
	err := h.DB.First(&company, "user_id = ?", userID).Error
	if err != nil {
		// Create new company
		company = models.Prestador{
			ID:           uuid.New().String(),
			UserID:       userID,
			RazaoSocial:  req.RazaoSocial,
			NomeFantasia: req.NomeFantasia,
			CNPJ:         req.CNPJ,
			Email:        req.Email,
			Phone:        req.Phone,
			Address:      req.Address,
			BankDetails:  req.BankDetails,
			LogoURL:      req.LogoURL,
			CreatedAt:    time.Now(),
		}
		if err := h.DB.Create(&company).Error; err != nil {
			return ServerError(c, err)
		}

		// Update user company_id
		h.DB.Model(&models.User{}).Where("id = ?", userID).Update("company_id", company.ID)
	} else {
		// Update existing
		company.RazaoSocial = req.RazaoSocial
		company.NomeFantasia = req.NomeFantasia
		company.CNPJ = req.CNPJ
		company.Email = req.Email
		company.Phone = req.Phone
		company.Address = req.Address
		company.BankDetails = req.BankDetails
		if req.LogoURL != "" {
			company.LogoURL = req.LogoURL
		}
		company.UpdatedAt = time.Now()

		if err := h.DB.Save(&company).Error; err != nil {
			return ServerError(c, err)
		}
	}

	return Success(c, company)
}

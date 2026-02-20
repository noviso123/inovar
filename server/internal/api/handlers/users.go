package handlers

import (
	"fmt"
	"time"

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
	query := h.DB.Model(&domain.User{})

	// Prestador only sees their company's users
	if role == domain.RolePrestador && companyID != "" {
		query = query.Where("company_id = ? OR id = ?", companyID, middleware.GetUserID(c))
	}

	query.Order("created_at DESC").Find(&users)

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

	// Validate role
	validRoles := []string{domain.RolePrestador, domain.RoleTecnico, domain.RoleCliente}
	isValid := false
	for _, r := range validRoles {
		if req.Role == r {
			isValid = true
			break
		}
	}
	if !isValid && middleware.GetUserRole(c) != domain.RoleAdmin {
		return BadRequest(c, "Role inválido")
	}

	// Check if email exists
	var count int64
	h.DB.Model(&domain.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return BadRequest(c, "Email já cadastrado")
	}

	// Hash password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	// Set company ID for non-admin creators
	companyID := req.CompanyID
	if middleware.GetUserRole(c) == domain.RolePrestador {
		companyID = middleware.GetCompanyID(c)
	}

	user := domain.User{
		ID:                 uuid.New().String(),
		Name:               req.Name,
		Email:              req.Email,
		PasswordHash:       string(hashedPassword),
		Role:               req.Role,
		Phone:              req.Phone,
		Active:             true,
		MustChangePassword: true,
		CompanyID:          &companyID,
		AvatarURL:          req.AvatarURL,
		CreatedAt:          time.Now(),
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// Create related Technician profile if it's a technician
	if req.Role == domain.RoleTecnico {
		tecnico := domain.Tecnico{
			ID:          uuid.New().String(),
			UserID:      user.ID,
			CompanyID:   companyID,
			Specialties: req.Specialties,
			CreatedAt:   time.Now(),
		}
		h.DB.Create(&tecnico)
	}

	// Broadcast event
	h.Hub.Broadcast("user:created", user)

	// Send Notifications (Email)
	go func() {
		// Email
		if h.EmailService != nil && user.Email != "" {
			h.EmailService.SendWelcomeEmail(user.Email, user.Name, req.Password)
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

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	before := user // Copy original state
	user.Name = req.Name
	user.Phone = req.Phone
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	user.UpdatedAt = time.Now()

	// Only admin can change role
	if middleware.GetUserRole(c) == domain.RoleAdmin && req.Role != "" {
		user.Role = req.Role
	}

	h.DB.Save(&user)

	// Update technician specialties if applicable
	if user.Role == domain.RoleTecnico {
		h.DB.Model(&domain.Tecnico{}).Where("user_id = ?", user.ID).Update("specialties", req.Specialties)
	}

	h.Hub.Broadcast("user:updated", user)

	// Final Audit
	h.LogAudit(c, "User", user.ID, "UPDATE", fmt.Sprintf("Updated user %s (Role: %s)", user.Email, user.Role), before, user)

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

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Generate temporary password
	tempPassword := "123456"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)

	user.PasswordHash = string(hashedPassword)
	user.MustChangePassword = true
	user.UpdatedAt = time.Now()
	h.DB.Save(&user)

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

	var user domain.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Start transaction
	tx := h.DB.Begin()

	// 1. Null out assigned requests if this user was responsible
	if err := tx.Model(&domain.Solicitacao{}).Where("responsible_id = ?", id).Updates(map[string]interface{}{
		"responsible_id":   nil,
		"responsible_name": nil,
	}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 2. Delete Agenda items for this user
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&domain.Agenda{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 3. Delete History entries created by this user
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&domain.SolicitacaoHistorico{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 4. Delete NFSe Events created by this user
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&domain.NFSeEvento{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 5. Delete related Technician profile if exists
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&domain.Tecnico{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 6. Delete User permanently
	if err := tx.Unscoped().Delete(&user).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	if err := tx.Commit().Error; err != nil {
		return ServerError(c, err)
	}

	// Broadcast event
	h.Hub.Broadcast("user:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Usuário excluído permanentemente"})
}

// GetCompany returns the company profile for the authenticated provider
func (h *Handler) GetCompany(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var company domain.Prestador
	if err := h.DB.Preload("Endereco").First(&company, "user_id = ?", userID).Error; err != nil {
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
			"endereco":     nil,
		})
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

	var company domain.Prestador
	// check if exists, if not create
	err := h.DB.Preload("Endereco").First(&company, "user_id = ?", userID).Error
	if err != nil {
		// Create structured address if provided
		var enderecoID *string
		if req.Endereco != nil {
			endereco := domain.Endereco{
				ID:         uuid.New().String(),
				Street:     req.Endereco.Street,
				Number:     req.Endereco.Number,
				Complement: req.Endereco.Complement,
				District:   req.Endereco.District,
				City:       req.Endereco.City,
				State:      req.Endereco.State,
				ZipCode:    req.Endereco.ZipCode,
			}
			if err := h.DB.Create(&endereco).Error; err == nil {
				enderecoID = &endereco.ID
			}
		}

		// Create new company
		company = domain.Prestador{
			ID:           uuid.New().String(),
			UserID:       userID,
			RazaoSocial:  req.RazaoSocial,
			NomeFantasia: req.NomeFantasia,
			CNPJ:         req.CNPJ,
			Email:        req.Email,
			Phone:        req.Phone,
			Address:      req.Address,
			EnderecoID:   enderecoID,
			BankDetails:  req.BankDetails,
			PixKey:       req.PixKey,
			PixKeyType:   req.PixKeyType,
			LogoURL:      req.LogoURL,
			CreatedAt:    time.Now(),
		}
		if err := h.DB.Create(&company).Error; err != nil {
			return ServerError(c, err)
		}

		// Update user company_id
		h.DB.Model(&domain.User{}).Where("id = ?", userID).Update("company_id", company.ID)
	} else {
		// Update existing
		company.RazaoSocial = req.RazaoSocial
		company.NomeFantasia = req.NomeFantasia
		company.CNPJ = req.CNPJ
		company.Email = req.Email
		company.Phone = req.Phone
		company.Address = req.Address
		company.BankDetails = req.BankDetails
		company.PixKey = req.PixKey
		company.PixKeyType = req.PixKeyType
		if req.LogoURL != "" {
			company.LogoURL = req.LogoURL
		}
		company.UpdatedAt = time.Now()

		// Update or Create address
		if req.Endereco != nil {
			if company.EnderecoID != nil && *company.EnderecoID != "" {
				// Update existing address
				h.DB.Model(&domain.Endereco{}).Where("id = ?", *company.EnderecoID).Updates(map[string]interface{}{
					"street":     req.Endereco.Street,
					"number":     req.Endereco.Number,
					"complement": req.Endereco.Complement,
					"district":   req.Endereco.District,
					"city":       req.Endereco.City,
					"state":      req.Endereco.State,
					"zip_code":   req.Endereco.ZipCode,
				})
			} else {
				// Create new address
				endereco := domain.Endereco{
					ID:         uuid.New().String(),
					Street:     req.Endereco.Street,
					Number:     req.Endereco.Number,
					Complement: req.Endereco.Complement,
					District:   req.Endereco.District,
					City:       req.Endereco.City,
					State:      req.Endereco.State,
					ZipCode:    req.Endereco.ZipCode,
				}
				if err := h.DB.Create(&endereco).Error; err == nil {
					company.EnderecoID = &endereco.ID
				}
			}
		}

		if err := h.DB.Save(&company).Error; err != nil {
			return ServerError(c, err)
		}
	}

	return Success(c, company)
}

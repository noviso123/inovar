package handlers

import (
	"fmt"
	"os"
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

	// Hash password (keep for local legacy/reporting if needed, but not for auth)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	// SYNC TO SUPABASE FIRST
	var supabaseID *string
	if h.SupabaseService != nil {
		sID, err := h.SupabaseService.AdminCreateUser(req.Email, req.Password)
		if err != nil {
			return BadRequest(c, fmt.Sprintf("Erro ao criar usuário no Supabase: %v", err))
		}
		supabaseID = &sID
	}

	// Set company ID for non-admin creators
	companyID := req.CompanyID
	if middleware.GetUserRole(c) == models.RolePrestador {
		companyID = middleware.GetCompanyID(c)
	}

	user := models.User{
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
		SupabaseID:         supabaseID,
		CreatedAt:          time.Now(),
	}

	if err := h.DB.Create(&user).Error; err != nil {
		// Cleanup Supabase if local DB fails
		if supabaseID != nil && h.SupabaseService != nil {
			h.SupabaseService.AdminDeleteUser(*supabaseID)
		}
		return ServerError(c, err)
	}

	// Broadcast event
	h.Hub.Broadcast("user:created", user)

	// Send Notifications
	go func() {
		// Email
		if h.EmailService != nil && user.Email != "" {
			h.EmailService.SendWelcomeEmail(user.Email, user.Name, req.Password)
		}

		// WhatsApp
		if h.WhatsAppService != nil && user.Phone != "" {
			msg := fmt.Sprintf("👋 Bem-vindo(a) ao *Inovar Gestão*, %s!\n\nSeu cadastro foi realizado com sucesso.\n📧 Email: %s\n🔑 Senha: %s\n\nAcesse em: %s", user.Name, user.Email, req.Password, os.Getenv("FRONTEND_URL"))
			h.WhatsAppService.SendMessage(user.Phone, msg)
		}
	}()

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

	before := user // Copy original state
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

	// SYNC TO SUPABASE
	if user.SupabaseID != nil && *user.SupabaseID != "" && h.SupabaseService != nil {
		h.SupabaseService.AdminUpdateUser(*user.SupabaseID, user.Email, nil, nil)
	}

	h.Hub.Broadcast("user:updated", user)

	// Final Audit
	h.LogAudit(c, "User", user.ID, "UPDATE", fmt.Sprintf("Updated user %s (Role: %s)", user.Email, user.Role), before, user)

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

	// SYNC TO SUPABASE
	if user.SupabaseID != nil && *user.SupabaseID != "" && h.SupabaseService != nil {
		h.SupabaseService.AdminUpdateUser(*user.SupabaseID, "", nil, &user.Active)
	}

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
	tempPassword := "123456"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)

	user.PasswordHash = string(hashedPassword)
	user.MustChangePassword = true
	user.UpdatedAt = time.Now()
	h.DB.Save(&user)

	// SYNC TO SUPABASE
	if user.SupabaseID != nil && *user.SupabaseID != "" && h.SupabaseService != nil {
		h.SupabaseService.AdminUpdateUser(*user.SupabaseID, "", &tempPassword, nil)
	}

	return Success(c, fiber.Map{
		"message":      "Senha resetada com sucesso",
		"tempPassword": tempPassword,
	})
}

// DeleteUser permanently deletes a user (admin only)
func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Start transaction
	tx := h.DB.Begin()

	// 1. Null out assigned requests if this user was responsible
	if err := tx.Model(&models.Solicitacao{}).Where("responsible_id = ?", id).Updates(map[string]interface{}{
		"responsible_id":   nil,
		"responsible_name": nil,
	}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 2. Delete Agenda items for this user
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&models.Agenda{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 3. Delete History entries created by this user
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&models.SolicitacaoHistorico{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 4. Delete NFSe Events created by this user
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&models.NFSeEvento{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 5. Delete related Technician profile if exists
	if err := tx.Unscoped().Where("user_id = ?", id).Delete(&models.Tecnico{}).Error; err != nil {
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

	// 7. SYNC TO SUPABASE
	if user.SupabaseID != nil && *user.SupabaseID != "" && h.SupabaseService != nil {
		h.SupabaseService.AdminDeleteUser(*user.SupabaseID)
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
	PixKey       string `json:"pixKey"`
	PixKeyType   string `json:"pixKeyType"`
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
			PixKey:       req.PixKey,
			PixKeyType:   req.PixKeyType,
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
		company.PixKey = req.PixKey
		company.PixKeyType = req.PixKeyType
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

// SyncGoogleTokensRequest represents the payload for syncing Google tokens
type SyncGoogleTokensRequest struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    int64  `json:"expiresAt"` // Unix timestamp
}

// SyncGoogleTokens updates the authenticated user's Google OAuth tokens
func (h *Handler) SyncGoogleTokens(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req SyncGoogleTokensRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Update tokens
	user.GoogleAccessToken = req.AccessToken
	if req.RefreshToken != "" {
		user.GoogleRefreshToken = req.RefreshToken
	}
	if req.ExpiresAt > 0 {
		user.GoogleTokenExpiry = time.Unix(req.ExpiresAt, 0)
	}
	user.UpdatedAt = time.Now()

	if err := h.DB.Save(&user).Error; err != nil {
		return ServerError(c, err)
	}

	// Log Audit
	h.LogAudit(c, "User", user.ID, "SYNC_TOKENS", fmt.Sprintf("Synced Google tokens for user %s", user.Email), nil, nil)

	return Success(c, fiber.Map{"message": "Tokens sincronizados com sucesso"})
}

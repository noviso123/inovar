package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
)

// ListUsers returns all users based on role
func (h *Handler) ListUsers(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)

	path := "/db/users?company_id=" + companyID
	if role == domain.RoleAdmin {
		path = "/db/users"
	}

	res, err := bridge.CallPyService("GET", path, nil)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, res["data"])
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
	if middleware.GetUserRole(c) == domain.RolePrestador {
		companyID = middleware.GetCompanyID(c)
	}

	pyReq := map[string]interface{}{
		"name":          req.Name,
		"email":         req.Email,
		"password_hash": string(hashedPassword),
		"role":          req.Role,
		"phone":         req.Phone,
		"company_id":    companyID,
		"avatar_url":    req.AvatarURL,
		"specialties":   req.Specialties,
	}

	res, err := bridge.CallPyService("POST", "/db/users", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	userData := res["data"]
	h.Hub.Broadcast("user:created", userData)

	// Send Notifications (Email)
	go func() {
		if h.EmailService != nil && req.Email != "" {
			h.EmailService.SendWelcomeEmail(req.Email, req.Name, password)
		}
	}()

	return Created(c, userData)
}

// GetUser returns a specific user
func (h *Handler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("GET", "/db/users/"+id, nil)
	if err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	return Success(c, res["data"])
}

// UpdateUser updates a user
func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Capture state for audit
	resBefore, _ := bridge.CallPyService("GET", "/db/users/"+id, nil)
	before := resBefore["data"]

	res, err := bridge.CallPyService("PUT", "/db/users/"+id, req)
	if err != nil {
		return ServerError(c, err)
	}

	userData := res["data"]
	h.Hub.Broadcast("user:updated", userData)

	// Final Audit
	h.LogAudit(c, "User", id, "UPDATE", fmt.Sprintf("Updated user %s", req.Email), before, userData)

	return Success(c, userData)
}

// BlockUser blocks or unblocks a user
func (h *Handler) BlockUser(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("PATCH", "/db/users/"+id+"/block", nil)
	if err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	userData := res["data"]
	h.Hub.Broadcast("user:updated", userData)

	return Success(c, userData)
}

// AdminResetPassword resets user password (admin/prestador only)
func (h *Handler) AdminResetPassword(c *fiber.Ctx) error {
	id := c.Params("id")

	// Generate temporary password
	tempPassword := "123456"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)

	pyReq := map[string]interface{}{
		"password_hash": string(hashedPassword),
	}
	res, err := bridge.CallPyService("POST", "/db/users/"+id+"/reset-password", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	userData := res["data"].(map[string]interface{})
	email := userData["email"].(string)
	name := userData["name"].(string)

	// Send email with new temporary password
	go func() {
		if h.EmailService != nil && email != "" {
			h.EmailService.SendPasswordResetByAdmin(email, name, tempPassword)
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

	_, err := bridge.CallPyService("DELETE", "/db/users/"+id, nil)
	if err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	// Broadcast event
	h.Hub.Broadcast("user:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Usuário excluído permanentemente"})
}

// GetCompany returns the company profile for the authenticated provider
func (h *Handler) GetCompany(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	res, err := bridge.CallPyService("GET", "/db/prestadores/by-user/"+userID, nil)
	if err != nil {
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

	return Success(c, res["data"])
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

	pyReq := map[string]interface{}{
		"razao_social":  req.RazaoSocial,
		"nome_fantasia": req.NomeFantasia,
		"cnpj":          req.CNPJ,
		"email":         req.Email,
		"phone":         req.Phone,
		"address":       req.Address,
		"bank_details":  req.BankDetails,
		"pix_key":       req.PixKey,
		"pix_key_type":  req.PixKeyType,
		"logo_url":      req.LogoURL,
		"endereco":      req.Endereco,
	}

	res, err := bridge.CallPyService("PUT", "/db/prestadores/by-user/"+userID, pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, res["data"])
}

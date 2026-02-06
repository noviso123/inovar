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

// ListClients returns clients based on user role
func (h *Handler) ListClients(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	var clients []models.Cliente
	query := h.DB.Model(&models.Cliente{})

	switch role {
	case models.RoleCliente:
		// Client only sees themselves
		query = query.Where("user_id = ?", userID)
	case models.RolePrestador, models.RoleTecnico:
		// See clients from their company
		query = query.Where("company_id = ?", companyID)
	}
	// Admin sees all

	// Admin sees all

	query.Preload("User").Order("name ASC").Find(&clients)

	// Populate Active field from User
	for i := range clients {
		clients[i].Active = clients[i].User.Active
	}

	return Success(c, clients)
}

// CreateClientRequest represents client creation payload
type CreateClientRequest struct {
	Name     string                 `json:"name"`
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	Phone    string                 `json:"phone"`
	Document string                 `json:"document"`
	Endereco *CreateEnderecoRequest `json:"endereco,omitempty"`
}

// CreateEnderecoRequest represents address creation
type CreateEnderecoRequest struct {
	Street     string `json:"street"`
	Number     string `json:"number"`
	Complement string `json:"complement"`
	District   string `json:"district"`
	City       string `json:"city"`
	State      string `json:"state"`
	ZipCode    string `json:"zipCode"`
}

// CreateClient creates a new client
func (h *Handler) CreateClient(c *fiber.Ctx) error {
	var req CreateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Check if email exists
	var count int64
	h.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return BadRequest(c, "Email já cadastrado")
	}

	// Get company ID
	companyID := middleware.GetCompanyID(c)
	if companyID == "" {
		// For demo, use first prestador
		var prestador models.Prestador
		h.DB.First(&prestador)
		companyID = prestador.ID
	}

	// Hash password
	password := req.Password
	if password == "" {
		// Use default password from config
		password = h.Config.DefaultPassword
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// Create user first
	user := models.User{
		ID:                 uuid.New().String(),
		Name:               req.Name,
		Email:              req.Email,
		PasswordHash:       string(hashedPassword),
		Role:               models.RoleCliente,
		Phone:              req.Phone,
		Active:             true,
		MustChangePassword: true,
		CompanyID:          &companyID,
		CreatedAt:          time.Now(),
	}
	h.DB.Create(&user)

	// Create address if provided
	var enderecoID *string
	if req.Endereco != nil {
		endereco := models.Endereco{
			ID:         uuid.New().String(),
			Street:     req.Endereco.Street,
			Number:     req.Endereco.Number,
			Complement: req.Endereco.Complement,
			District:   req.Endereco.District,
			City:       req.Endereco.City,
			State:      req.Endereco.State,
			ZipCode:    req.Endereco.ZipCode,
		}
		h.DB.Create(&endereco)
		enderecoID = &endereco.ID
	}

	// Create client
	cliente := models.Cliente{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		Name:       req.Name,
		Document:   req.Document,
		Email:      req.Email,
		Phone:      req.Phone,
		EnderecoID: enderecoID,
		CompanyID:  companyID,
		CreatedAt:  time.Now(),
	}
	h.DB.Create(&cliente)

	h.Hub.Broadcast("client:created", cliente)

	// Send Notifications (Email & WhatsApp)
	go func() {
		// Email
		if h.EmailService != nil && user.Email != "" {
			h.EmailService.SendWelcomeEmail(user.Email, user.Name, req.Password)
		}

		// WhatsApp
		if h.WhatsAppService != nil && user.Phone != "" {
			msg := fmt.Sprintf("👋 Olá *%s*!\n\nSeu acesso à área do *Inovar Gestão* foi criado.\n\n🔗 Link: %s\n📧 Usuário: %s\n🔑 Senha: %s\n\nQualquer dúvida, estamos à disposição.", user.Name, os.Getenv("FRONTEND_URL"), user.Email, req.Password)
			h.WhatsAppService.SendMessage(user.Phone, msg)
		}
	}()

	return Created(c, cliente)
}

// GetClient returns a specific client
func (h *Handler) GetClient(c *fiber.Ctx) error {
	id := c.Params("id")
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)

	var cliente models.Cliente
	query := h.DB.Preload("Endereco")

	// Client can only see themselves
	if role == models.RoleCliente {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.Preload("User").First(&cliente, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	cliente.Active = cliente.User.Active

	return Success(c, cliente)
}

// UpdateClient updates a client
func (h *Handler) UpdateClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var cliente models.Cliente
	if err := h.DB.First(&cliente, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	var req CreateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	cliente.Name = req.Name
	cliente.Phone = req.Phone
	cliente.Document = req.Document
	cliente.UpdatedAt = time.Now()

	// Update user as well
	h.DB.Model(&models.User{}).Where("id = ?", cliente.UserID).Updates(map[string]interface{}{
		"name":  req.Name,
		"phone": req.Phone,
	})

	h.DB.Save(&cliente)

	h.Hub.Broadcast("client:updated", cliente)

	return Success(c, cliente)
}

// BlockClient blocks or unblocks a client
func (h *Handler) BlockClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var cliente models.Cliente
	if err := h.DB.First(&cliente, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	// Toggle user active status
	var user models.User
	h.DB.First(&user, "id = ?", cliente.UserID)
	user.Active = !user.Active
	h.DB.Save(&user)

	action := "client:blocked"
	if user.Active {
		action = "client:unblocked"
	}
	h.Hub.Broadcast(action, cliente)

	return Success(c, fiber.Map{"active": user.Active})
}

// DeleteClient deletes a client (soft delete for prestador, hard for admin)
func (h *Handler) DeleteClient(c *fiber.Ctx) error {
	id := c.Params("id")
	role := middleware.GetUserRole(c)

	var cliente models.Cliente
	if err := h.DB.First(&cliente, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	if role == models.RoleAdmin {
		// Permanent delete
		h.DB.Unscoped().Delete(&cliente)
		h.DB.Unscoped().Delete(&models.User{}, "id = ?", cliente.UserID)
	} else {
		// Soft delete via blocking
		h.DB.Model(&models.User{}).Where("id = ?", cliente.UserID).Update("active", false)
	}

	h.Hub.Broadcast("client:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Cliente removido"})
}

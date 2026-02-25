package handlers

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
)

// ListClients returns clients based on user role
func (h *Handler) ListClients(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	var clients []domain.Cliente
	query := h.DB.Preload("Endereco")

	if role == domain.RoleCliente {
		// A client can only see their own profile?
		// Actually, Cliente domain model usually represents the legal entity/person.
		// If the user role is CLIENTE, find the client associated with this UserID.
		query = query.Where("user_id = ?", userID)
	} else if role != domain.RoleAdmin {
		query = query.Where("company_id = ?", companyID)
	}

	if err := query.Find(&clients).Error; err != nil {
		return ServerError(c, err)
	}

	return Success(c, clients)
}

// CreateClientRequest represents client creation payload
type CreateClientRequest struct {
	Name      string                 `json:"name"`
	Email     string                 `json:"email"`
	Password  string                 `json:"password"`
	Phone     string                 `json:"phone"`
	Document  string                 `json:"document"`
	AvatarURL string                 `json:"avatarUrl"`
	Endereco  *CreateEnderecoRequest `json:"endereco,omitempty"`
}

// CreateClient creates a new client
func (h *Handler) CreateClient(c *fiber.Ctx) error {
	var req CreateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Get company ID
	companyID := middleware.GetCompanyID(c)
	if companyID == "" {
		var company struct {
			ID string
		}
		if err := h.DB.Table("prestadores").Select("id").First(&company).Error; err != nil {
			return BadRequest(c, "Nenhuma empresa (prestador) cadastrada no sistema")
		}
		companyID = company.ID
	}

	// Create User account for the client
	password := req.Password
	if password == "" {
		password = h.Config.DefaultPassword
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	userId := uuid.New().String()
	user := domain.User{
		ID:                 userId,
		Email:              req.Email,
		Name:               req.Name,
		PasswordHash:       string(hashedPassword),
		Role:               domain.RoleCliente,
		Phone:              req.Phone,
		Active:             true,
		AvatarURL:          req.AvatarURL,
		CompanyID:          &companyID,
		MustChangePassword: true,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		log.Printf("❌ Falha ao criar conta de usuário para o cliente: %v", err)
		return BadRequest(c, fmt.Sprintf("Erro ao criar conta de acesso: %v", err))
	}

	// Create Endereco if provided
	var enderecoID *string
	if req.Endereco != nil {
		addrID := uuid.New().String()
		endereco := domain.Endereco{
			ID:         addrID,
			Street:     req.Endereco.Street,
			Number:     req.Endereco.Number,
			Complement: req.Endereco.Complement,
			District:   req.Endereco.District,
			City:       req.Endereco.City,
			State:      req.Endereco.State,
			ZipCode:    req.Endereco.ZipCode,
		}
		if err := h.DB.Create(&endereco).Error; err == nil {
			enderecoID = &addrID
		}
	}

	// Create Cliente
	client := domain.Cliente{
		ID:         uuid.New().String(),
		UserID:     userId,
		CompanyID:  companyID,
		Name:       req.Name,
		Email:      req.Email,
		Phone:      req.Phone,
		Document:   req.Document,
		EnderecoID: enderecoID,
		Active:     true,
	}

	if err := h.DB.Create(&client).Error; err != nil {
		log.Printf("❌ Falha crítica ao salvar cliente no banco: %v", err)
		return BadRequest(c, fmt.Sprintf("Não foi possível salvar os dados do cliente: %v", err))
	}

	h.Hub.Broadcast("client:created", client)

	// Send Notifications (Email)
	go func() {
		if h.EmailService != nil && req.Email != "" {
			h.EmailService.SendWelcomeEmail(req.Email, req.Name, password)
		}
	}()

	return Created(c, client)
}

// GetClient returns a specific client
func (h *Handler) GetClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var client domain.Cliente
	if err := h.DB.Preload("Endereco").First(&client, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	return Success(c, client)
}

// UpdateClient updates a client
func (h *Handler) UpdateClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var req CreateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var client domain.Cliente
	if err := h.DB.First(&client, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	before := client

	client.Name = req.Name
	client.Email = req.Email
	client.Phone = req.Phone
	client.Document = req.Document

	// Handle Address
	if req.Endereco != nil {
		var endereco domain.Endereco
		if client.EnderecoID != nil {
			h.DB.First(&endereco, "id = ?", *client.EnderecoID)
		} else {
			addrID := uuid.New().String()
			endereco.ID = addrID
			client.EnderecoID = &addrID
		}

		endereco.Street = req.Endereco.Street
		endereco.Number = req.Endereco.Number
		endereco.Complement = req.Endereco.Complement
		endereco.District = req.Endereco.District
		endereco.City = req.Endereco.City
		endereco.State = req.Endereco.State
		endereco.ZipCode = req.Endereco.ZipCode

		h.DB.Save(&endereco)
	}

	if err := h.DB.Save(&client).Error; err != nil {
		return ServerError(c, err)
	}

	// Update associated user if email changed or needed
	h.DB.Model(&domain.User{}).Where("id = ?", client.UserID).Updates(map[string]interface{}{
		"name":  client.Name,
		"email": client.Email,
		"phone": client.Phone,
	})

	h.Hub.Broadcast("client:updated", client)

	// Final Audit
	h.LogAudit(c, "Client", id, "UPDATE", fmt.Sprintf("Updated client %s", req.Name), before, client)

	return Success(c, client)
}

// BlockClient blocks or unblocks a client
func (h *Handler) BlockClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var client domain.Cliente
	if err := h.DB.First(&client, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	client.Active = !client.Active
	if err := h.DB.Save(&client).Error; err != nil {
		return ServerError(c, err)
	}

	// Also block/unblock the user
	h.DB.Model(&domain.User{}).Where("id = ?", client.UserID).Update("active", client.Active)

	action := "client:blocked"
	if client.Active {
		action = "client:unblocked"
	}
	h.Hub.Broadcast(action, fiber.Map{"id": id})

	return Success(c, fiber.Map{"active": client.Active})
}

// DeleteClient deletes a client
func (h *Handler) DeleteClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var client domain.Cliente
	if err := h.DB.First(&client, "id = ?", id).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	// Delete in transaction
	tx := h.DB.Begin()

	// Delete solicitudes/requests related to this client?
	// Usually better to keep them or archive. For now, let's just delete the client surface.

	if err := tx.Delete(&client).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// Delete user
	tx.Delete(&domain.User{}, "id = ?", client.UserID)

	// Delete address if exists
	if client.EnderecoID != nil {
		tx.Delete(&domain.Endereco{}, "id = ?", *client.EnderecoID)
	}

	tx.Commit()

	h.Hub.Broadcast("client:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Cliente e todos os dados associados foram removidos permanentemente"})
}

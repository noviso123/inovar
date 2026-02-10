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

	query.Preload("User").Preload("Endereco").Order("name ASC").Find(&clients)

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

	// Update or Create address
	if req.Endereco != nil {
		if cliente.EnderecoID != nil && *cliente.EnderecoID != "" {
			// Update existing address
			h.DB.Model(&models.Endereco{}).Where("id = ?", *cliente.EnderecoID).Updates(map[string]interface{}{
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
			if err := h.DB.Create(&endereco).Error; err == nil {
				cliente.EnderecoID = &endereco.ID
			}
		}
	}

	// Update user as well
	h.DB.Model(&models.User{}).Where("id = ?", cliente.UserID).Updates(map[string]interface{}{
		"name":  req.Name,
		"phone": req.Phone,
	})

	before := cliente // Copy original state
	if err := h.DB.Save(&cliente).Error; err != nil {
		return ServerError(c, err)
	}

	// Reload with address for the broadcast
	h.DB.Preload("Endereco").First(&cliente, "id = ?", cliente.ID)
	h.Hub.Broadcast("client:updated", cliente)

	// Final Audit
	h.LogAudit(c, "Client", cliente.ID, "UPDATE", fmt.Sprintf("Updated client %s", cliente.Name), before, cliente)

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

	if role == models.RoleAdmin || role == models.RolePrestador {
		// Permanent delete - Start transaction
		tx := h.DB.Begin()

		// Capture UserID for cleanup of orphans
		userID := cliente.UserID

		// 1. Find all service requests for this client
		var requestIDs []string
		tx.Model(&models.Solicitacao{}).Where("client_id = ?", id).Pluck("id", &requestIDs)

		// 2. Cascadingly delete all requests and their dependencies
		for _, reqID := range requestIDs {
			// Delete dependencies of each request by SolicitacaoID to be safe
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.Anexo{})
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.Checklist{})
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.SolicitacaoHistorico{})
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.SolicitacaoEquipamento{})
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.OrcamentoItem{})

			// Delete NFSe and Events
			tx.Exec("DELETE FROM nfse_eventos WHERE nfse_id IN (SELECT id FROM notas_fiscais WHERE solicitacao_id = ?)", reqID)
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.NotaFiscal{})

			// Delete from Agenda
			tx.Unscoped().Where("solicitacao_id = ?", reqID).Delete(&models.Agenda{})
		}

		// 3. Delete the requests themselves
		if len(requestIDs) > 0 {
			if err := tx.Unscoped().Where("client_id = ?", id).Delete(&models.Solicitacao{}).Error; err != nil {
				tx.Rollback()
				return ServerError(c, err)
			}
		}

		// 4. Delete associated Equipments (Hard Delete)
		if err := tx.Unscoped().Where("client_id = ?", id).Delete(&models.Equipamento{}).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}

		// 5. Clean up any ORPHAN records linked to the UserID (Extra safety)
		// This handles cases where history/agenda might exist but request was already gone or unlinked
		tx.Unscoped().Where("user_id = ?", userID).Delete(&models.Agenda{})
		tx.Unscoped().Where("user_id = ?", userID).Delete(&models.SolicitacaoHistorico{})
		tx.Unscoped().Where("user_id = ?", userID).Delete(&models.NFSeEvento{})

		// 6. Capture address ID before deleting client
		var addrID *string = cliente.EnderecoID

		// 7. Delete the Client
		if err := tx.Unscoped().Delete(&cliente).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}

		// 8. Delete the Address if it exists
		if addrID != nil && *addrID != "" {
			if err := tx.Unscoped().Delete(&models.Endereco{}, "id = ?", *addrID).Error; err != nil {
				tx.Rollback()
				return ServerError(c, err)
			}
		}

		// 9. Delete the User (This is the final step)
		if err := tx.Unscoped().Delete(&models.User{}, "id = ?", userID).Error; err != nil {
			tx.Rollback()
			return ServerError(c, err)
		}

		if err := tx.Commit().Error; err != nil {
			return ServerError(c, err)
		}
	} else {
		// Soft delete via blocking
		h.DB.Model(&models.User{}).Where("id = ?", cliente.UserID).Update("active", false)
	}

	h.Hub.Broadcast("client:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Cliente e todos os dados associados foram removidos permanentemente"})
}

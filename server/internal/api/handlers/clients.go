package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
)

// ListClients returns clients based on user role
func (h *Handler) ListClients(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	path := "/db/clients?company_id=" + companyID
	if role == domain.RoleCliente {
		path += "&user_id=" + userID
	} else if role == domain.RoleAdmin {
		path = "/db/clients"
	}

	res, err := bridge.CallPyService("GET", path, nil)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, res["data"])
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
		// For demo, use first prestador
		var prestador domain.Prestador
		h.DB.First(&prestador)
		companyID = prestador.ID
	}

	// Hash password
	password := req.Password
	if password == "" {
		password = h.Config.DefaultPassword
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// Call Python service
	pyReq := map[string]interface{}{
		"name":          req.Name,
		"email":         req.Email,
		"password_hash": string(hashedPassword),
		"phone":         req.Phone,
		"document":      req.Document,
		"company_id":    companyID,
		"endereco":      req.Endereco,
		"avatar_url":    req.AvatarURL,
	}

	res, err := bridge.CallPyService("POST", "/db/clients", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	clientData := res["data"]
	h.Hub.Broadcast("client:created", clientData)

	// Send Notifications (Email)
	go func() {
		if h.EmailService != nil && req.Email != "" {
			h.EmailService.SendWelcomeEmail(req.Email, req.Name, password)
		}
	}()

	return Created(c, clientData)
}

// GetClient returns a specific client
func (h *Handler) GetClient(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("GET", "/db/clients/"+id, nil)
	if err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	return Success(c, res["data"])
}

// UpdateClient updates a client
func (h *Handler) UpdateClient(c *fiber.Ctx) error {
	id := c.Params("id")

	var req CreateClientRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Capture state for audit
	resBefore, _ := bridge.CallPyService("GET", "/db/clients/"+id, nil)
	before := resBefore["data"]

	res, err := bridge.CallPyService("PUT", "/db/clients/"+id, req)
	if err != nil {
		return ServerError(c, err)
	}

	clientData := res["data"]
	h.Hub.Broadcast("client:updated", clientData)

	// Final Audit
	h.LogAudit(c, "Client", id, "UPDATE", fmt.Sprintf("Updated client %s", req.Name), before, clientData)

	return Success(c, clientData)
}

// BlockClient blocks or unblocks a client
func (h *Handler) BlockClient(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("PATCH", "/db/clients/"+id+"/block", nil)
	if err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	clientData := res["data"].(map[string]interface{})
	active := clientData["active"].(bool)

	action := "client:blocked"
	if active {
		action = "client:unblocked"
	}
	h.Hub.Broadcast(action, fiber.Map{"id": id})

	return Success(c, fiber.Map{"active": active})
}

// DeleteClient deletes a client (delegates cascading logic to Python)
func (h *Handler) DeleteClient(c *fiber.Ctx) error {
	id := c.Params("id")

	_, err := bridge.CallPyService("DELETE", "/db/clients/"+id, nil)
	if err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	h.Hub.Broadcast("client:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Cliente e todos os dados associados foram removidos permanentemente"})
}

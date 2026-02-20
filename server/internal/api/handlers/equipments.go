package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
)

// ListEquipments returns equipments based on user role
func (h *Handler) ListEquipments(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)
	clientID := c.Query("clientId")
	activeOnly := c.Query("activeOnly", "true")

	path := fmt.Sprintf("/db/equipments?company_id=%s&client_id=%s&active_only=%s", companyID, clientID, activeOnly)
	if role == domain.RoleAdmin {
		path = fmt.Sprintf("/db/equipments?client_id=%s&active_only=%s", clientID, activeOnly)
	}

	res, err := bridge.CallPyService("GET", path, nil)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, res["data"])
}

// CreateEquipmentRequest represents equipment creation payload
type CreateEquipmentRequest struct {
	ClientID           string `json:"clientId"`
	Brand              string `json:"brand"`
	Model              string `json:"model"`
	BTU                int    `json:"btu"`
	SerialNumber       string `json:"serialNumber"`
	Location           string `json:"location"`
	LastPreventiveDate string `json:"lastPreventiveDate"`
	PreventiveInterval int    `json:"preventiveInterval"`
}

// CreateEquipment creates a new equipment
func (h *Handler) CreateEquipment(c *fiber.Ctx) error {
	var req CreateEquipmentRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Get companyID from client via bridge
	resClient, err := bridge.CallPyService("GET", "/db/clients/"+req.ClientID, nil)
	if err != nil {
		return BadRequest(c, "Cliente não encontrado")
	}
	clientData := resClient["data"].(map[string]interface{})
	companyID := clientData["companyId"].(string)

	pyReq := map[string]interface{}{
		"client_id":           req.ClientID,
		"company_id":          companyID,
		"brand":               req.Brand,
		"model":               req.Model,
		"btu":                 req.BTU,
		"serial_number":       req.SerialNumber,
		"location":            req.Location,
		"preventive_interval": req.PreventiveInterval,
	}

	res, err := bridge.CallPyService("POST", "/db/equipments", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	equipData := res["data"]
	h.Hub.Broadcast("equipment:created", equipData)

	return Created(c, equipData)
}

// GetEquipment returns a specific equipment
func (h *Handler) GetEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("GET", "/db/equipments/"+id, nil)
	if err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	return Success(c, res["data"])
}

// UpdateEquipment updates an equipment
func (h *Handler) UpdateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var req CreateEquipmentRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Capture state for audit
	resBefore, _ := bridge.CallPyService("GET", "/db/equipments/"+id, nil)
	before := resBefore["data"]

	res, err := bridge.CallPyService("PUT", "/db/equipments/"+id, req)
	if err != nil {
		return ServerError(c, err)
	}

	equipData := res["data"]
	h.Hub.Broadcast("equipment:updated", equipData)

	// Final Audit
	h.LogAudit(c, "Equipment", id, "UPDATE", fmt.Sprintf("Updated equipment %s", req.Model), before, equipData)

	return Success(c, equipData)
}

// DeactivateEquipment deactivates an equipment (never delete!)
func (h *Handler) DeactivateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("PATCH", "/db/equipments/"+id+"/deactivate", nil)
	if err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	equipData := res["data"]
	h.Hub.Broadcast("equipment:updated", equipData)

	return Success(c, equipData)
}

// ReactivateEquipment reactivates an equipment
func (h *Handler) ReactivateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("PATCH", "/db/equipments/"+id+"/reactivate", nil)
	if err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	equipData := res["data"]
	h.Hub.Broadcast("equipment:updated", equipData)

	return Success(c, equipData)
}

// DeleteEquipment permanently deletes (ADMIN ONLY!)
func (h *Handler) DeleteEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	_, err := bridge.CallPyService("DELETE", "/db/equipments/"+id, nil)
	if err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	h.Hub.Broadcast("equipment:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Equipamento excluído permanentemente"})
}

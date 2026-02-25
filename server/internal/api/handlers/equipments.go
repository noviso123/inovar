package handlers

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
)

// ListEquipments returns equipments based on user role
func (h *Handler) ListEquipments(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)
	clientID := c.Query("clientId")
	activeOnly := c.Query("activeOnly", "true")

	var equipments []domain.Equipamento
	query := h.DB.Preload("Client")

	if role != domain.RoleAdmin {
		query = query.Where("company_id = ?", companyID)
	}

	if clientID != "" {
		query = query.Where("client_id = ?", clientID)
	}

	if activeOnly == "true" {
		query = query.Where("active = ?", true)
	}

	if err := query.Find(&equipments).Error; err != nil {
		return ServerError(c, err)
	}

	return Success(c, equipments)
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

	// Get companyID from client
	var client domain.Cliente
	if err := h.DB.First(&client, "id = ?", req.ClientID).Error; err != nil {
		return BadRequest(c, "Cliente não encontrado")
	}

	equipment := domain.Equipamento{
		ID:                 uuid.New().String(),
		ClientID:           req.ClientID,
		CompanyID:          client.CompanyID,
		Brand:              req.Brand,
		Model:              req.Model,
		BTU:                req.BTU,
		SerialNumber:       req.SerialNumber,
		Location:           req.Location,
		PreventiveInterval: req.PreventiveInterval,
		Active:             true,
	}

	if req.LastPreventiveDate != "" {
		if t, err := time.Parse(time.RFC3339, req.LastPreventiveDate); err == nil {
			equipment.LastPreventiveDate = &t
			// Calculate next preventive
			if req.PreventiveInterval > 0 {
				next := t.AddDate(0, req.PreventiveInterval, 0)
				equipment.NextPreventiveDate = &next
			}
		}
	}

	if err := h.DB.Create(&equipment).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("equipment:created", equipment)

	return Created(c, equipment)
}

// GetEquipment returns a specific equipment
func (h *Handler) GetEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var equipment domain.Equipamento
	if err := h.DB.Preload("Client").First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	return Success(c, equipment)
}

// UpdateEquipment updates an equipment
func (h *Handler) UpdateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var req CreateEquipmentRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var equipment domain.Equipamento
	if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	before := equipment

	equipment.Brand = req.Brand
	equipment.Model = req.Model
	equipment.BTU = req.BTU
	equipment.SerialNumber = req.SerialNumber
	equipment.Location = req.Location
	equipment.PreventiveInterval = req.PreventiveInterval

	if req.LastPreventiveDate != "" {
		if t, err := time.Parse(time.RFC3339, req.LastPreventiveDate); err == nil {
			equipment.LastPreventiveDate = &t
			if req.PreventiveInterval > 0 {
				next := t.AddDate(0, req.PreventiveInterval, 0)
				equipment.NextPreventiveDate = &next
			}
		}
	}

	if err := h.DB.Save(&equipment).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("equipment:updated", equipment)

	// Final Audit
	h.LogAudit(c, "Equipment", id, "UPDATE", fmt.Sprintf("Updated equipment %s", req.Model), before, equipment)

	return Success(c, equipment)
}

// DeactivateEquipment deactivates an equipment
func (h *Handler) DeactivateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var equipment domain.Equipamento
	if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	equipment.Active = false
	if err := h.DB.Save(&equipment).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("equipment:updated", equipment)

	return Success(c, equipment)
}

// ReactivateEquipment reactivates an equipment
func (h *Handler) ReactivateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var equipment domain.Equipamento
	if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	equipment.Active = true
	if err := h.DB.Save(&equipment).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("equipment:updated", equipment)

	return Success(c, equipment)
}

// DeleteEquipment permanently deletes
func (h *Handler) DeleteEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.DB.Delete(&domain.Equipamento{}, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	h.Hub.Broadcast("equipment:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Equipamento excluído permanentemente"})
}

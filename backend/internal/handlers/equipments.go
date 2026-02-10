package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// ListEquipments returns equipments based on user role
func (h *Handler) ListEquipments(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)

	clientID := c.Query("clientId")
	activeOnly := c.Query("activeOnly", "true") == "true"

	var equipments []models.Equipamento
	query := h.DB.Model(&models.Equipamento{})

	// Filter by active if requested
	if activeOnly {
		query = query.Where("active = ?", true)
	}

	switch role {
	case models.RoleCliente:
		// Client only sees their own equipments
		var cliente models.Cliente
		h.DB.Where("user_id = ?", userID).First(&cliente)
		query = query.Where("client_id = ?", cliente.ID)
	default:
		// Filter by client if provided
		if clientID != "" {
			query = query.Where("client_id = ?", clientID)
		}
	}

	query.Order("location ASC").Find(&equipments)

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

	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)

	// For clients, use their own client ID
	clientID := req.ClientID
	if role == models.RoleCliente {
		var cliente models.Cliente
		h.DB.Where("user_id = ?", userID).First(&cliente)
		clientID = cliente.ID
	}

	if clientID == "" {
		return BadRequest(c, "Cliente é obrigatório")
	}

	if clientID == "" {
		return BadRequest(c, "Cliente é obrigatório")
	}

	// Calculate Initial Preventive Date
	interval := req.PreventiveInterval
	if interval <= 0 {
		interval = 90 // Default fallback
		var s models.Setting
		if err := h.DB.Where("key = ?", "preventive_interval").First(&s).Error; err == nil && s.Value != "" {
			if val, err := strconv.Atoi(s.Value); err == nil {
				interval = val
			}
		}
	}

	baseDate := time.Now()
	lastPreventive, _ := ParseDateTime(req.LastPreventiveDate)
	if lastPreventive != nil {
		baseDate = *lastPreventive
	}
	nextDate := baseDate.AddDate(0, 0, interval)

	equipment := models.Equipamento{
		ID:                 uuid.New().String(),
		ClientID:           clientID,
		Brand:              req.Brand,
		Model:              req.Model,
		BTU:                req.BTU,
		SerialNumber:       req.SerialNumber,
		Location:           req.Location,
		Active:             true,
		CreatedAt:          time.Now(),
		LastPreventiveDate: lastPreventive,
		NextPreventiveDate: &nextDate,
		PreventiveInterval: req.PreventiveInterval,
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
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)

	var equipment models.Equipamento

	if role == models.RoleCliente {
		// Verify ownership
		var cliente models.Cliente
		h.DB.Where("user_id = ?", userID).First(&cliente)
		if err := h.DB.Where("id = ? AND client_id = ?", id, cliente.ID).First(&equipment).Error; err != nil {
			return NotFound(c, "Equipamento não encontrado")
		}
	} else {
		if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
			return NotFound(c, "Equipamento não encontrado")
		}
	}

	return Success(c, equipment)
}

// UpdateEquipment updates an equipment
func (h *Handler) UpdateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)

	var equipment models.Equipamento

	// Check ownership for clients
	if role == models.RoleCliente {
		var cliente models.Cliente
		h.DB.Where("user_id = ?", userID).First(&cliente)
		if err := h.DB.Where("id = ? AND client_id = ?", id, cliente.ID).First(&equipment).Error; err != nil {
			return NotFound(c, "Equipamento não encontrado")
		}
	} else {
		if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
			return NotFound(c, "Equipamento não encontrado")
		}
	}

	var req CreateEquipmentRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	before := equipment // Copy original state
	equipment.UpdatedAt = time.Now()

	h.DB.Save(&equipment)

	h.Hub.Broadcast("equipment:updated", equipment)

	// Final Audit
	h.LogAudit(c, "Equipment", equipment.ID, "UPDATE", fmt.Sprintf("Updated equipment %s (%s)", equipment.Model, equipment.Brand), before, equipment)

	return Success(c, equipment)
}

// DeactivateEquipment deactivates an equipment (never delete!)
func (h *Handler) DeactivateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var equipment models.Equipamento
	if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	equipment.Active = false
	equipment.UpdatedAt = time.Now()
	h.DB.Save(&equipment)

	h.Hub.Broadcast("equipment:deactivated", equipment)

	return Success(c, equipment)
}

// ReactivateEquipment reactivates an equipment
func (h *Handler) ReactivateEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var equipment models.Equipamento
	if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	equipment.Active = true
	equipment.UpdatedAt = time.Now()
	h.DB.Save(&equipment)

	h.Hub.Broadcast("equipment:reactivated", equipment)

	return Success(c, equipment)
}

// DeleteEquipment permanently deletes (ADMIN ONLY!)
func (h *Handler) DeleteEquipment(c *fiber.Ctx) error {
	id := c.Params("id")

	var equipment models.Equipamento
	if err := h.DB.First(&equipment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Equipamento não encontrado")
	}

	// Permanent delete - also for Prestador
	// Start transaction to clean up junction table
	tx := h.DB.Begin()

	// 1. Delete associations in solicitacao_equipamentos
	if err := tx.Where("equipamento_id = ?", id).Delete(&models.SolicitacaoEquipamento{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 2. Delete Checklists associated with this equipment
	if err := tx.Unscoped().Where("equipamento_id = ?", id).Delete(&models.Checklist{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 3. Delete equipment itself
	if err := tx.Unscoped().Delete(&equipment).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	if err := tx.Commit().Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("equipment:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Equipamento excluído permanentemente"})
}

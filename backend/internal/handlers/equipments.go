package handlers

import (
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
	ClientID     string `json:"clientId"`
	Brand        string `json:"brand"`
	Model        string `json:"model"`
	BTU          int    `json:"btu"`
	SerialNumber string `json:"serialNumber"`
	Location     string `json:"location"`
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

	equipment := models.Equipamento{
		ID:           uuid.New().String(),
		ClientID:     clientID,
		Brand:        req.Brand,
		Model:        req.Model,
		BTU:          req.BTU,
		SerialNumber: req.SerialNumber,
		Location:     req.Location,
		Active:       true,
		CreatedAt:    time.Now(),
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

	equipment.Brand = req.Brand
	equipment.Model = req.Model
	equipment.BTU = req.BTU
	equipment.SerialNumber = req.SerialNumber
	equipment.Location = req.Location
	equipment.UpdatedAt = time.Now()

	h.DB.Save(&equipment)

	h.Hub.Broadcast("equipment:updated", equipment)

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

	// Permanent delete - only for Admin
	h.DB.Unscoped().Delete(&equipment)

	h.Hub.Broadcast("equipment:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Equipamento excluído permanentemente"})
}

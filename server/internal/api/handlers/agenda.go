package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
)

// GetAgenda returns agenda entries
func (h *Handler) GetAgenda(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)

	// Query params
	startStr := c.Query("start")
	endStr := c.Query("end")
	technicianID := c.Query("technicianId")

	var agenda []domain.Agenda
	query := h.DB

	if role != domain.RoleAdmin {
		query = query.Where("company_id = ?", companyID)
	}

	if role == domain.RoleTecnico {
		query = query.Where("user_id = ?", userID)
	} else if technicianID != "" {
		query = query.Where("user_id = ?", technicianID)
	}

	if startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			query = query.Where("scheduled_at >= ?", t)
		}
	}
	if endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			query = query.Where("scheduled_at <= ?", t)
		}
	}

	if err := query.Find(&agenda).Error; err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, agenda)
}

// CreateAgendaRequest represents agenda entry creation
type CreateAgendaRequest struct {
	UserID        string `json:"userId,omitempty"`
	SolicitacaoID string `json:"solicitacaoId"`
	Title         string `json:"title"`
	ScheduledAt   string `json:"scheduledAt"`
	Duration      int    `json:"duration"`
	Notes         string `json:"notes,omitempty"`
}

// CreateAgendaEntry creates a new agenda entry
func (h *Handler) CreateAgendaEntry(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)

	var req CreateAgendaRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	targetUserID := req.UserID
	if role == domain.RoleTecnico || targetUserID == "" {
		targetUserID = userID
	}

	entry := domain.Agenda{
		ID:            uuid.New().String(),
		UserID:        targetUserID,
		SolicitacaoID: req.SolicitacaoID,
		Title:         req.Title,
		Duration:      req.Duration,
		Notes:         req.Notes,
	}

	if req.ScheduledAt != "" {
		if t, err := time.Parse(time.RFC3339, req.ScheduledAt); err == nil {
			entry.ScheduledAt = t
		}
	}

	if err := h.DB.Create(&entry).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("agenda:created", entry)

	return Created(c, entry)
}

// UpdateAgendaEntry updates an agenda entry
func (h *Handler) UpdateAgendaEntry(c *fiber.Ctx) error {
	id := c.Params("id")

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var entry domain.Agenda
	if err := h.DB.First(&entry, "id = ?", id).Error; err != nil {
		return NotFound(c, "Agendamento não encontrado")
	}

	if err := h.DB.Model(&entry).Updates(req).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("agenda:updated", entry)

	return Success(c, entry)
}

// DeleteAgendaEntry deletes an agenda entry
func (h *Handler) DeleteAgendaEntry(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.DB.Delete(&domain.Agenda{}, "id = ?", id).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("agenda:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Agendamento removido"})
}

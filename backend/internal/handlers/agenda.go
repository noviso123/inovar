package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// GetAgenda returns agenda entries
func (h *Handler) GetAgenda(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)
	companyID := middleware.GetCompanyID(c)

	// Query params
	start := c.Query("start")
	end := c.Query("end")
	technicianID := c.Query("technicianId")

	var agenda []models.Agenda
	query := h.DB.Preload("Solicitacao")

	// Filter by user/company
	switch role {
	case models.RoleTecnico:
		query = query.Where("user_id = ?", userID)
	case models.RolePrestador:
		// All technicians from company
		query = query.Where("user_id IN (SELECT id FROM users WHERE company_id = ?)", companyID)
	}

	// Filter by technician if provided
	if technicianID != "" {
		query = query.Where("user_id = ?", technicianID)
	}

	// Filter by date range
	if start != "" && end != "" {
		startTime, _ := time.Parse("2006-01-02", start)
		endTime, _ := time.Parse("2006-01-02", end)
		query = query.Where("scheduled_at >= ? AND scheduled_at <= ?", startTime, endTime.Add(24*time.Hour))
	}

	query.Order("scheduled_at ASC").Find(&agenda)

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

	// For technicians, use their own ID
	targetUserID := req.UserID
	if role == models.RoleTecnico || targetUserID == "" {
		targetUserID = userID
	}

	scheduledAt, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		return BadRequest(c, "Data inválida")
	}

	agenda := models.Agenda{
		ID:            uuid.New().String(),
		UserID:        targetUserID,
		SolicitacaoID: req.SolicitacaoID,
		Title:         req.Title,
		ScheduledAt:   scheduledAt,
		Duration:      req.Duration,
		Notes:         req.Notes,
		CreatedAt:     time.Now(),
	}

	h.DB.Create(&agenda)

	// Update solicitacao status and scheduled date
	h.DB.Model(&models.Solicitacao{}).Where("id = ?", req.SolicitacaoID).Updates(map[string]interface{}{
		"status":       models.StatusAgendada,
		"scheduled_at": scheduledAt,
	})

	h.Hub.Broadcast("agenda:created", agenda)

	return Created(c, agenda)
}

// UpdateAgendaEntry updates an agenda entry
func (h *Handler) UpdateAgendaEntry(c *fiber.Ctx) error {
	id := c.Params("id")

	var agenda models.Agenda
	if err := h.DB.First(&agenda, "id = ?", id).Error; err != nil {
		return NotFound(c, "Agendamento não encontrado")
	}

	var req CreateAgendaRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	if req.ScheduledAt != "" {
		scheduledAt, _ := time.Parse(time.RFC3339, req.ScheduledAt)
		agenda.ScheduledAt = scheduledAt

		// Update solicitacao scheduled date
		h.DB.Model(&models.Solicitacao{}).Where("id = ?", agenda.SolicitacaoID).Update("scheduled_at", scheduledAt)
	}

	if req.Duration > 0 {
		agenda.Duration = req.Duration
	}
	if req.Notes != "" {
		agenda.Notes = req.Notes
	}
	if req.Title != "" {
		agenda.Title = req.Title
	}

	agenda.UpdatedAt = time.Now()
	h.DB.Save(&agenda)

	h.Hub.Broadcast("agenda:updated", agenda)

	return Success(c, agenda)
}

// DeleteAgendaEntry deletes an agenda entry
func (h *Handler) DeleteAgendaEntry(c *fiber.Ctx) error {
	id := c.Params("id")

	var agenda models.Agenda
	if err := h.DB.First(&agenda, "id = ?", id).Error; err != nil {
		return NotFound(c, "Agendamento não encontrado")
	}

	// Start transaction
	tx := h.DB.Begin()

	// 1. Clear scheduled date in solicitacao
	if err := tx.Model(&models.Solicitacao{}).Where("id = ?", agenda.SolicitacaoID).Update("scheduled_at", nil).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 2. Delete agenda entry
	if err := tx.Delete(&agenda).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	tx.Commit()

	h.Hub.Broadcast("agenda:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Agendamento removido"})
}

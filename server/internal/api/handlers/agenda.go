package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
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

	path := fmt.Sprintf("/db/agenda/?company_id=%s&start=%s&end=%s", companyID, start, end)
	if role == domain.RoleTecnico {
		path = fmt.Sprintf("/db/agenda/?user_id=%s&start=%s&end=%s", userID, start, end)
	}
	if technicianID != "" {
		path = fmt.Sprintf("/db/agenda/?user_id=%s&start=%s&end=%s", technicianID, start, end)
	}

	res, err := bridge.CallPyService("GET", path, nil)
	if err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, res["data"])
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

	pyReq := map[string]interface{}{
		"user_id":        targetUserID,
		"solicitacao_id": req.SolicitacaoID,
		"title":          req.Title,
		"scheduled_at":   req.ScheduledAt,
		"duration":       req.Duration,
		"notes":          req.Notes,
	}

	res, err := bridge.CallPyService("POST", "/db/agenda/", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	agendaData := res["data"]
	h.Hub.Broadcast("agenda:created", agendaData)

	return Created(c, agendaData)
}

// UpdateAgendaEntry updates an agenda entry
func (h *Handler) UpdateAgendaEntry(c *fiber.Ctx) error {
	id := c.Params("id")

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	res, err := bridge.CallPyService("PUT", "/db/agenda/"+id, req)
	if err != nil {
		return ServerError(c, err)
	}

	agendaData := res["data"]
	h.Hub.Broadcast("agenda:updated", agendaData)

	return Success(c, agendaData)
}

// DeleteAgendaEntry deletes an agenda entry
func (h *Handler) DeleteAgendaEntry(c *fiber.Ctx) error {
	id := c.Params("id")

	_, err := bridge.CallPyService("DELETE", "/db/agenda/"+id, nil)
	if err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("agenda:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Agendamento removido"})
}

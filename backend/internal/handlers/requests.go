package handlers

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// SLA hours by priority
var slaHours = map[string]int{
	models.PriorityBaixa:       72,
	models.PriorityMedia:       48,
	models.PriorityAlta:        24,
	models.PriorityEmergencial: 6,
}

// ListRequests returns requests based on user role
func (h *Handler) ListRequests(c *fiber.Ctx) error {
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	// Query params
	status := c.Query("status")
	priority := c.Query("priority")
	clientID := c.Query("clientId")

	var requests []models.Solicitacao
	query := h.DB.Preload("Equipments.Equipamento").Preload("Client.Endereco")

	switch role {
	case models.RoleCliente:
		// Client only sees their own requests
		var cliente models.Cliente
		h.DB.Where("user_id = ?", userID).First(&cliente)
		query = query.Where("client_id = ?", cliente.ID)
	case models.RoleTecnico:
		// Technician sees requests assigned to them or from their company
		query = query.Where("responsible_id = ? OR client_id IN (SELECT id FROM clientes WHERE company_id = ?)", userID, companyID)
	case models.RolePrestador:
		// Prestador sees all from their company
		query = query.Where("client_id IN (SELECT id FROM clientes WHERE company_id = ?)", companyID)
	}
	// Admin sees all

	// Apply filters
	// Pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset := (page - 1) * limit

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if clientID != "" {
		query = query.Where("client_id = ?", clientID)
	}

	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&requests)

	return Success(c, requests)
}

// CreateRequestRequest represents request creation payload
type CreateRequestRequest struct {
	ClientID     string   `json:"clientId"`
	EquipmentIDs []string `json:"equipmentIds"`
	Priority     string   `json:"priority"`
	ServiceType  string   `json:"serviceType"`
	Description  string   `json:"description"`
	ScheduledAt  string   `json:"scheduledAt,omitempty"`
}

// CreateRequest creates a new service request
func (h *Handler) CreateRequest(c *fiber.Ctx) error {
	var req CreateRequestRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	if len(req.EquipmentIDs) == 0 {
		return BadRequest(c, "Selecione pelo menos um equipamento")
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

	// Get client name
	var cliente models.Cliente
	h.DB.First(&cliente, "id = ?", clientID)

	// Calculate SLA
	sla := slaHours[req.Priority]
	if sla == 0 {
		sla = 48 // Default
	}

	// Parse scheduled date
	scheduledAt, err := ParseDateTime(req.ScheduledAt)
	if err != nil {
		return BadRequest(c, "Data de agendamento inválida: "+err.Error())
	}

	if req.ServiceType == "" {
		return BadRequest(c, "Tipo de serviço é obrigatório")
	}

	// Get next sequential number
	var maxNumero int
	h.DB.Model(&models.Solicitacao{}).Select("COALESCE(MAX(numero), 0)").Scan(&maxNumero)
	nextNumero := maxNumero + 1

	solicitacao := models.Solicitacao{
		ID:          uuid.New().String(),
		Numero:      nextNumero,
		ClientID:    clientID,
		ClientName:  cliente.Name,
		Status:      models.StatusAberta,
		Priority:    req.Priority,
		ServiceType: req.ServiceType,
		Description: req.Description,
		ScheduledAt: scheduledAt,
		SLALimit:    time.Now().Add(time.Duration(sla) * time.Hour),
		CreatedAt:   time.Now(),
	}

	if err := h.DB.Create(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	// Create equipment associations
	for _, eqID := range req.EquipmentIDs {
		assoc := models.SolicitacaoEquipamento{
			ID:            uuid.New().String(),
			SolicitacaoID: solicitacao.ID,
			EquipamentoID: eqID,
		}
		h.DB.Create(&assoc)
	}

	// Create initial history
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	history := models.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: solicitacao.ID,
		UserID:        userID,
		UserName:      user.Name,
		Action:        "Abertura de OS",
		Details:       "Solicitação criada com prioridade " + req.Priority,
		CreatedAt:     time.Now(),
	}
	h.DB.Create(&history)

	// Reload with associations
	h.DB.Preload("Equipments.Equipamento").First(&solicitacao, "id = ?", solicitacao.ID)

	h.Hub.Broadcast("request:created", solicitacao)

	// Send Notifications (Email & WhatsApp)
	go func() {
		// Email
		if h.EmailService != nil && cliente.Email != "" {
			osNum := strconv.Itoa(solicitacao.Numero)
			h.EmailService.SendOSCreated(cliente.Email, cliente.Name, osNum, solicitacao.Description)
		}

		// WhatsApp
		if h.WhatsAppService != nil && cliente.Phone != "" {
			osNum := strconv.Itoa(solicitacao.Numero)
			msg := fmt.Sprintf("🔧 *Inovar Gestão*\n\nOlá %s! 👋\nUma nova Ordem de Serviço foi aberta para você.\n\n*OS #%s*\n📄 %s\n\nAcompanhe o status pelo nosso sistema.", cliente.Name, osNum, solicitacao.Description)
			h.WhatsAppService.SendMessage(cliente.Phone, msg)
		}
	}()

	return Created(c, solicitacao)
}

// GetRequest returns a specific request (supports both UUID and sequential number)
func (h *Handler) GetRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	role := middleware.GetUserRole(c)
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	query := h.DB.Preload("Equipments.Equipamento").Preload("Client.Endereco").Preload("History").Preload("Checklists").Preload("Attachments").Preload("OrcamentoItens")

	// Check scope
	if role == models.RoleCliente {
		var cliente models.Cliente
		h.DB.Where("user_id = ?", userID).First(&cliente)
		query = query.Where("client_id = ?", cliente.ID)
	}

	// Try to find by UUID first, then by numero
	if err := query.First(&solicitacao, "id = ?", id).Error; err != nil {
		// Try by numero (sequential number)
		if err := query.First(&solicitacao, "numero = ?", id).Error; err != nil {
			return NotFound(c, "Solicitação não encontrada")
		}
	}

	return Success(c, solicitacao)
}

// UpdateRequest updates a request
func (h *Handler) UpdateRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Check lock
	if solicitacao.LockedBy != nil && *solicitacao.LockedBy != userID {
		if solicitacao.LockedAt != nil && time.Since(*solicitacao.LockedAt).Seconds() < float64(h.Config.LockTimeoutSecs) {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"success":  false,
				"error":    "locked",
				"message":  "Solicitação está sendo editada por outro usuário",
				"lockedBy": *solicitacao.LockedBy,
			})
		}
	}

	var req CreateRequestRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	solicitacao.Priority = req.Priority
	solicitacao.ServiceType = req.ServiceType
	solicitacao.Description = req.Description
	solicitacao.UpdatedAt = time.Now()

	h.DB.Save(&solicitacao)

	// Update history
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	history := models.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: solicitacao.ID,
		UserID:        userID,
		UserName:      user.Name,
		Action:        "Atualização",
		Details:       "Dados da solicitação atualizados",
		CreatedAt:     time.Now(),
	}
	h.DB.Create(&history)

	h.Hub.Broadcast("request:updated", solicitacao)

	return Success(c, solicitacao)
}

// UpdateRequestDetailsRequest represents details update payload
type UpdateRequestDetailsRequest struct {
	ResponsibleID   string `json:"responsibleId"`
	ResponsibleName string `json:"responsibleName"`
	Priority        string `json:"priority"`
}

// UpdateRequestDetails updates specific administrative details of a request
func (h *Handler) UpdateRequestDetails(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)

	// Only Admin can update these details
	if role != models.RoleAdmin && role != models.RolePrestador {
		return Forbidden(c, "Apenas administradores podem alterar detalhes técnicos")
	}

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	var req UpdateRequestDetailsRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var changes []string

	// Update Responsible
	// Update Responsible
	if req.ResponsibleID == "REMOVE" {
		if solicitacao.ResponsibleID != nil {
			oldResp := solicitacao.ResponsibleName
			solicitacao.ResponsibleID = nil
			solicitacao.ResponsibleName = ""
			changes = append(changes, "Técnico removido (era '"+oldResp+"')")
		}
	} else if req.ResponsibleID != "" && (solicitacao.ResponsibleID == nil || *solicitacao.ResponsibleID != req.ResponsibleID) {
		oldResp := solicitacao.ResponsibleName
		solicitacao.ResponsibleID = &req.ResponsibleID
		solicitacao.ResponsibleName = req.ResponsibleName
		if solicitacao.Status == models.StatusAberta {
			solicitacao.Status = models.StatusAtribuida
		}
		changes = append(changes, "Técnico alterado de '"+oldResp+"' para '"+req.ResponsibleName+"'")
	}

	// Update Priority
	if req.Priority != "" && solicitacao.Priority != req.Priority {
		oldPriority := solicitacao.Priority
		solicitacao.Priority = req.Priority
		// Recalculate SLA based on new priority if still open
		if solicitacao.Status != models.StatusFinalizada && solicitacao.Status != models.StatusCancelada {
			sla := slaHours[req.Priority]
			if sla == 0 {
				sla = 48
			}
			solicitacao.SLALimit = time.Now().Add(time.Duration(sla) * time.Hour)
		}
		changes = append(changes, "Prioridade alterada de '"+oldPriority+"' para '"+req.Priority+"'")
	}

	if len(changes) > 0 {
		solicitacao.UpdatedAt = time.Now()
		h.DB.Save(&solicitacao)

		// Create history
		var user models.User
		h.DB.First(&user, "id = ?", userID)

		history := models.SolicitacaoHistorico{
			ID:            uuid.New().String(),
			SolicitacaoID: solicitacao.ID,
			UserID:        userID,
			UserName:      user.Name,
			Action:        "Atualização Administrativa",
			Details:       "Alterações: " + changes[0],
			CreatedAt:     time.Now(),
		}
		h.DB.Create(&history)

		h.Hub.Broadcast("request:updated", solicitacao)
	}

	return Success(c, solicitacao)
}

// UpdateStatusRequest represents status update payload
type UpdateStatusRequest struct {
	Status            string `json:"status"`
	Observation       string `json:"observation,omitempty"`
	MaterialsUsed     string `json:"materialsUsed"`
	NextMaintenanceAt string `json:"nextMaintenanceAt"`
	ScheduledAt       string `json:"scheduledAt"`
	PreventiveDone    bool   `json:"preventiveDone"` // New field
}

// UpdateRequestStatus updates request status
func (h *Handler) UpdateRequestStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)
	// Find request
	var solicitacao models.Solicitacao
	// Preload everything deeply
	if err := h.DB.
		Preload("Client").
		Preload("Client.Endereco"). // <--- CRITICAL: Load the address!
		Preload("Equipments").
		Preload("History").
		Preload("Attachments").
		Preload("OrcamentoItems").
		Preload("NotaFiscal").
		First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Client cannot change status
	if role == models.RoleCliente {
		return Forbidden(c, "Cliente não pode alterar status")
	}

	// Check if finalized or canceled (immutable)
	if solicitacao.Status == models.StatusFinalizada || solicitacao.Status == models.StatusCancelada {
		return BadRequest(c, "Solicitação já finalizada/cancelada não pode ser alterada")
	}

	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	oldStatus := solicitacao.Status
	solicitacao.Status = req.Status
	if req.Observation != "" {
		solicitacao.Observation = req.Observation
	}
	if req.MaterialsUsed != "" {
		solicitacao.MaterialsUsed = req.MaterialsUsed
	}
	if req.NextMaintenanceAt != "" {
		t, err := ParseDateTime(req.NextMaintenanceAt)
		if err == nil {
			solicitacao.NextMaintenanceAt = t
		} else {
			fmt.Printf("Error parsing NextMaintenanceAt: %v\n", err)
		}
	}

	if req.ScheduledAt != "" {
		t, err := ParseDateTime(req.ScheduledAt)
		if err == nil {
			solicitacao.ScheduledAt = t
		} else {
			fmt.Printf("Error parsing ScheduledAt: %v\n", err)
		}
	}
	solicitacao.UpdatedAt = time.Now()

	before := solicitacao // Copy original
	// AUTOMATED PREVENTIVE MAINTENANCE LOGIC
	if req.Status == models.StatusFinalizada && req.PreventiveDone {
		// 1. Get Global Default Interval
		var setting models.Setting
		defaultInterval := 90 // Default 90 days
		if err := h.DB.First(&setting, "key = ?", "preventive_interval").Error; err == nil {
			if val, err := strconv.Atoi(setting.Value); err == nil {
				defaultInterval = val
			}
		}

		now := time.Now()

		// 2. Update each equipment
		for _, assoc := range solicitacao.Equipments {
			equip := assoc.Equipamento
			interval := equip.PreventiveInterval
			if interval == 0 {
				interval = defaultInterval
			}

			// Calculate next date
			nextDate := now.AddDate(0, 0, interval)

			// Update equipment
			h.DB.Model(&equip).Updates(map[string]interface{}{
				"last_preventive_date": now,
				"next_preventive_date": nextDate,
			})
		}
	}

	h.DB.Save(&solicitacao)

	// Create history
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	history := models.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: solicitacao.ID,
		UserID:        userID,
		UserName:      user.Name,
		Action:        "Mudança de Status: " + req.Status,
		BeforeValue:   oldStatus,
		AfterValue:    req.Status,
		Details:       req.Observation,
		CreatedAt:     time.Now(),
	}
	if req.PreventiveDone {
		history.Details += " [Manutenção Preventiva Realizada]"
	}
	h.DB.Create(&history)

	h.Hub.Broadcast("request:status_changed", fiber.Map{
		"id":        id,
		"oldStatus": oldStatus,
		"newStatus": req.Status,
		"userId":    userID,
	})

	// Auto-Email on Finalization
	if req.Status == models.StatusFinalizada {
		go func() {
			if h.EmailService != nil && solicitacao.ClientName != "" {
				// We need to ensure solicitacao has Client loaded. Preload used earlier should have it.
				h.EmailService.SendOSFinalized(solicitacao.Client.Email, solicitacao.ClientName, fmt.Sprint(solicitacao.Numero), os.Getenv("FRONTEND_URL")+"/chamados/"+solicitacao.ID)
			}
		}()
	}

	// Final Audit
	h.LogAudit(c, "Request", solicitacao.ID, "UPDATE_STATUS", fmt.Sprintf("Changed status from %s to %s", oldStatus, solicitacao.Status), before, solicitacao)

	return Success(c, solicitacao)
}

// AssignRequestRequest represents assignment payload
type AssignRequestRequest struct {
	ResponsibleID   string `json:"responsibleId"`
	ResponsibleName string `json:"responsibleName"`
}

// AssignRequest assigns a technician to a request
func (h *Handler) AssignRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	var req AssignRequestRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Auto-assign for technicians
	responsibleID := req.ResponsibleID
	responsibleName := req.ResponsibleName

	var responsibleIDPtr *string
	if responsibleID == "REMOVE" {
		responsibleIDPtr = nil
		responsibleName = ""
	} else {
		if role == models.RoleTecnico && responsibleID == "" {
			responsibleID = userID
			var user models.User
			h.DB.First(&user, "id = ?", userID)
			responsibleName = user.Name
		}
		responsibleIDPtr = &responsibleID
	}

	oldResponsible := solicitacao.ResponsibleName
	solicitacao.ResponsibleID = responsibleIDPtr
	solicitacao.ResponsibleName = responsibleName
	if solicitacao.Status == models.StatusAberta {
		solicitacao.Status = models.StatusAtribuida
	}
	solicitacao.UpdatedAt = time.Now()

	h.DB.Save(&solicitacao)

	// Create history
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	action := "Atribuição"
	if oldResponsible != "" {
		action = "Reatribuição"
	}

	history := models.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: solicitacao.ID,
		UserID:        userID,
		UserName:      user.Name,
		Action:        action,
		BeforeValue:   oldResponsible,
		AfterValue:    responsibleName,
		Details:       "Técnico " + responsibleName + " atribuído",
		CreatedAt:     time.Now(),
	}
	h.DB.Create(&history)

	h.Hub.Broadcast("request:assigned", fiber.Map{
		"id":              id,
		"responsibleId":   responsibleID,
		"responsibleName": responsibleName,
	})

	return Success(c, solicitacao)
}

// GetRequestHistory returns request history
func (h *Handler) GetRequestHistory(c *fiber.Ctx) error {
	id := c.Params("id")

	var history []models.SolicitacaoHistorico
	h.DB.Where("solicitacao_id = ?", id).Order("created_at DESC").Find(&history)

	return Success(c, history)
}

// ConfirmRequest allows client to confirm service completion
func (h *Handler) ConfirmRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	if solicitacao.Status != models.StatusFinalizada {
		return BadRequest(c, "Só é possível confirmar solicitações finalizadas")
	}

	now := time.Now()
	solicitacao.ConfirmedAt = &now
	solicitacao.ConfirmedBy = &userID
	h.DB.Save(&solicitacao)

	// Create history
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	history := models.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: solicitacao.ID,
		UserID:        userID,
		UserName:      user.Name,
		Action:        "Confirmação do Cliente",
		Details:       "Serviço confirmado pelo cliente",
		CreatedAt:     time.Now(),
	}
	h.DB.Create(&history)

	h.Hub.Broadcast("request:confirmed", fiber.Map{"id": id})

	return Success(c, solicitacao)
}

// AcquireLock acquires edit lock on a request
func (h *Handler) AcquireLock(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Check if already locked by someone else
	if solicitacao.LockedBy != nil && *solicitacao.LockedBy != userID {
		timeout := time.Duration(h.Config.LockTimeoutSecs) * time.Second
		if solicitacao.LockedAt != nil && time.Since(*solicitacao.LockedAt) < timeout {
			var lockedUser models.User
			h.DB.First(&lockedUser, "id = ?", *solicitacao.LockedBy)
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"success":    false,
				"error":      "locked",
				"message":    lockedUser.Name + " está editando esta solicitação",
				"lockedBy":   *solicitacao.LockedBy,
				"lockedName": lockedUser.Name,
			})
		}
	}

	now := time.Now()
	solicitacao.LockedBy = &userID
	solicitacao.LockedAt = &now
	h.DB.Save(&solicitacao)

	var user models.User
	h.DB.First(&user, "id = ?", userID)

	h.Hub.Broadcast("request:locked", fiber.Map{
		"id":         id,
		"lockedBy":   userID,
		"lockedName": user.Name,
	})

	return Success(c, fiber.Map{"locked": true})
}

// ReleaseLock releases edit lock on a request
func (h *Handler) ReleaseLock(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Only the lock owner can release
	if solicitacao.LockedBy != nil && *solicitacao.LockedBy == userID {
		solicitacao.LockedBy = nil
		solicitacao.LockedAt = nil
		h.DB.Save(&solicitacao)
	}

	h.Hub.Broadcast("request:unlocked", fiber.Map{"id": id})

	return Success(c, fiber.Map{"locked": false})
}

// ListChecklists returns checklists for a request
func (h *Handler) ListChecklists(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	var checklists []models.Checklist
	h.DB.Where("solicitacao_id = ?", requestID).Order("created_at ASC").Find(&checklists)

	return Success(c, checklists)
}

// CreateChecklistRequest represents checklist creation payload
type CreateChecklistRequest struct {
	EquipamentoID string `json:"equipamentoId,omitempty"`
	Description   string `json:"description"`
}

// CreateChecklist creates a new checklist item
func (h *Handler) CreateChecklist(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	var req CreateChecklistRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var equipID *string
	if req.EquipamentoID != "" {
		equipID = &req.EquipamentoID
	}

	checklist := models.Checklist{
		ID:            uuid.New().String(),
		SolicitacaoID: requestID,
		EquipamentoID: equipID,
		Description:   req.Description,
		Checked:       false,
		CreatedAt:     time.Now(),
	}

	h.DB.Create(&checklist)

	h.Hub.Broadcast("checklist:created", checklist)

	return Created(c, checklist)
}

// UpdateChecklistRequest represents checklist update payload
type UpdateChecklistRequest struct {
	Checked     bool   `json:"checked"`
	Observation string `json:"observation"`
}

// UpdateChecklist updates a checklist item
func (h *Handler) UpdateChecklist(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var checklist models.Checklist
	if err := h.DB.First(&checklist, "id = ?", id).Error; err != nil {
		return NotFound(c, "Checklist não encontrado")
	}

	var req UpdateChecklistRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	checklist.Checked = req.Checked
	checklist.Observation = req.Observation

	if req.Checked {
		now := time.Now()
		checklist.CheckedAt = &now
		checklist.CheckedByID = &userID
		var user models.User
		h.DB.First(&user, "id = ?", userID)
		checklist.CheckedByName = user.Name
	}

	h.DB.Save(&checklist)

	h.Hub.Broadcast("checklist:updated", checklist)

	return Success(c, checklist)
}

// DeleteChecklist deletes a checklist item
func (h *Handler) DeleteChecklist(c *fiber.Ctx) error {
	id := c.Params("id")

	var checklist models.Checklist
	if err := h.DB.First(&checklist, "id = ?", id).Error; err != nil {
		return NotFound(c, "Checklist não encontrado")
	}

	h.DB.Delete(&checklist)

	h.Hub.Broadcast("checklist:deleted", fiber.Map{"id": id, "solicitacaoId": checklist.SolicitacaoID})

	return Success(c, fiber.Map{"message": "Checklist removido"})
}

// ListAttachments returns attachments for a request
func (h *Handler) ListAttachments(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	var attachments []models.Anexo
	h.DB.Where("solicitacao_id = ?", requestID).Order("created_at DESC").Find(&attachments)

	return Success(c, attachments)
}

// UploadAttachment uploads a file
func (h *Handler) UploadAttachment(c *fiber.Ctx) error {
	requestID := c.Params("requestId")
	userID := middleware.GetUserID(c)

	file, err := c.FormFile("file")
	if err != nil {
		return BadRequest(c, "Arquivo não fornecido")
	}

	// Check size
	if file.Size > h.Config.MaxUploadSize {
		return BadRequest(c, "Arquivo muito grande (máx "+strconv.FormatInt(h.Config.MaxUploadSize/1024/1024, 10)+"MB)")
	}

	// Save file using Supabase Storage (no local fallback)
	url, err := h.StorageService.UploadFile(file, "requests/"+requestID)
	if err != nil {
		return ServerError(c, err)
	}

	// Get user
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	attachment := models.Anexo{
		ID:             uuid.New().String(),
		SolicitacaoID:  requestID,
		FileName:       file.Filename,
		FilePath:       url,
		MimeType:       file.Header.Get("Content-Type"),
		FileSize:       file.Size,
		UploadedByID:   userID,
		UploadedByName: user.Name,
		CreatedAt:      time.Now(),
	}

	h.DB.Create(&attachment)

	h.Hub.Broadcast("attachment:created", attachment)

	return Created(c, attachment)
}

// DeleteAttachment deletes an attachment
func (h *Handler) DeleteAttachment(c *fiber.Ctx) error {
	id := c.Params("id")

	var attachment models.Anexo
	if err := h.DB.First(&attachment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Anexo não encontrado")
	}

	h.DB.Delete(&attachment)

	h.Hub.Broadcast("attachment:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Anexo removido"})
}

// Orcamento (Budget) Handlers

// GetOrcamentoSugestoes returns smart suggestions for AC maintenance budgets
func (h *Handler) GetOrcamentoSugestoes(c *fiber.Ctx) error {
	return Success(c, models.SugestoesOrcamento)
}

// AddOrcamentoItem adds a line item to a request's budget
func (h *Handler) AddOrcamentoItem(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var req struct {
		Descricao  string  `json:"descricao"`
		Quantidade float64 `json:"quantidade"`
		ValorUnit  float64 `json:"valorUnit"`
		Tipo       string  `json:"tipo"`
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Check if request exists
	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", requestID).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	valorTotal := req.Quantidade * req.ValorUnit

	item := models.OrcamentoItem{
		ID:            uuid.New().String(),
		SolicitacaoID: requestID,
		Descricao:     req.Descricao,
		Quantidade:    req.Quantidade,
		ValorUnit:     req.ValorUnit,
		ValorTotal:    valorTotal,
		Tipo:          req.Tipo,
		CreatedAt:     time.Now(),
	}

	h.DB.Create(&item)

	// Update total in solicitacao
	var total float64
	h.DB.Model(&models.OrcamentoItem{}).Where("solicitacao_id = ?", requestID).Select("COALESCE(SUM(valor_total), 0)").Scan(&total)
	h.DB.Model(&solicitacao).Update("valor_orcamento", total)

	// Log
	h.createHistoryEntry(requestID, userID, "Item de orçamento adicionado: "+req.Descricao)

	return Created(c, item)
}

// RemoveOrcamentoItem removes a line item from a budget
func (h *Handler) RemoveOrcamentoItem(c *fiber.Ctx) error {
	itemID := c.Params("itemId")
	userID := middleware.GetUserID(c)

	var item models.OrcamentoItem
	if err := h.DB.First(&item, "id = ?", itemID).Error; err != nil {
		return NotFound(c, "Item não encontrado")
	}

	requestID := item.SolicitacaoID
	h.DB.Delete(&item)

	// Update total
	var total float64
	h.DB.Model(&models.OrcamentoItem{}).Where("solicitacao_id = ?", requestID).Select("COALESCE(SUM(valor_total), 0)").Scan(&total)
	h.DB.Model(&models.Solicitacao{}).Where("id = ?", requestID).Update("valor_orcamento", total)

	h.createHistoryEntry(requestID, userID, "Item de orçamento removido")

	return Success(c, fiber.Map{"message": "Item removido"})
}

// AprovarOrcamento approves a budget
func (h *Handler) AprovarOrcamento(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", requestID).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	h.DB.Model(&solicitacao).Update("orcamento_aprovado", true)
	h.createHistoryEntry(requestID, userID, "Orçamento aprovado pelo cliente")

	return Success(c, fiber.Map{"message": "Orçamento aprovado"})
}

// Signature Handlers

// SalvarAssinatura saves client or technician signature
func (h *Handler) SalvarAssinatura(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var req struct {
		Assinatura string `json:"assinatura"` // Base64 encoded signature image
		Tipo       string `json:"tipo"`       // "cliente" or "tecnico"
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Validate signature size (approx 5MB limit for base64)
	if len(req.Assinatura) > 7000000 {
		return BadRequest(c, "Imagem de assinatura muito grande (máx 5MB)")
	}

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", requestID).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	updates := map[string]interface{}{}
	now := time.Now()

	if req.Tipo == "cliente" {
		updates["assinatura_cliente"] = req.Assinatura
		updates["data_assinatura"] = now
		h.createHistoryEntry(requestID, userID, "Assinatura do cliente registrada")
	} else if req.Tipo == "tecnico" || req.Tipo == "prestador" {
		updates["assinatura_tecnico"] = req.Assinatura
		h.createHistoryEntry(requestID, userID, "Assinatura do técnico/prestador registrada")
	}

	h.DB.Model(&solicitacao).Updates(updates)

	return Success(c, fiber.Map{"message": "Assinatura salva"})
}

// Helper to create history entries
func (h *Handler) createHistoryEntry(requestID, userID, description string) {
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	history := models.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: requestID,
		Action:        "UPDATE",
		Details:       description,
		UserID:        userID,
		UserName:      user.Name,
		CreatedAt:     time.Now(),
	}
	h.DB.Create(&history)
}

// DeleteRequest deletes a request (Admin/Prestador only)
func (h *Handler) DeleteRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	// userID := middleware.GetUserID(c) // Not needed if we hard delete everything

	var solicitacao models.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Use transaction to ensure data integrity
	tx := h.DB.Begin()

	// 1. Delete Attachments
	if err := tx.Where("solicitacao_id = ?", id).Delete(&models.Anexo{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 2. Delete Checklists
	if err := tx.Where("solicitacao_id = ?", id).Delete(&models.Checklist{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 3. Delete History
	if err := tx.Where("solicitacao_id = ?", id).Delete(&models.SolicitacaoHistorico{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 4. Delete Equipments (Join table)
	if err := tx.Where("solicitacao_id = ?", id).Delete(&models.SolicitacaoEquipamento{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 5. Delete Budget Items
	if err := tx.Where("solicitacao_id = ?", id).Delete(&models.OrcamentoItem{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 6. Delete NFSe records
	if err := tx.Where("solicitacao_id = ?", id).Delete(&models.NotaFiscal{}).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 7. Delete NFSe Events
	// Note: We search by NFSe ID first if needed, but since they are tied to OS, we can use a subquery or join if they have OS ID
	// Looking at the model, NFSeEvento has NFSeID. We need to find the NFSe ID first?
	// Actually, easier to just delete events where nfse_id IN (select id from notas_fiscais where solicitacao_id = ...)
	if err := tx.Exec("DELETE FROM nfse_eventos WHERE nfse_id IN (SELECT id FROM notas_fiscais WHERE solicitacao_id = ?)", id).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	// 8. Delete the Request itself
	if err := tx.Delete(&solicitacao).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	tx.Commit()

	return Success(c, fiber.Map{"message": "Chamado e dados relacionados excluídos com sucesso"})
}

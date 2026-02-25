package handlers

import (
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
)

// SLA hours by priority
var slaHours = map[string]int{
	domain.PriorityBaixa:       72,
	domain.PriorityMedia:       48,
	domain.PriorityAlta:        24,
	domain.PriorityEmergencial: 6,
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
	onlyMine := c.Query("onlyMine") == "true"

	var requests []domain.Solicitacao
	query := h.DB.Preload("Client").Preload("Equipments")

	// Global filtering by CompanyID for non-global admins (if multi-tenant)
	// But per user request: Admin & Tech see all, Client sees only their own.
	if role == domain.RoleCliente {
		// Find the Client record linked to this User
		var client domain.Cliente
		if err := h.DB.Where("user_id = ?", userID).First(&client).Error; err != nil {
			return Success(c, []domain.Solicitacao{}) // No client profile yet
		}
		query = query.Where("client_id = ?", client.ID)
	} else if role == domain.RoleTecnico || role == domain.RoleAdmin {
		// Admin and Tech see everything related to their company
		if role != domain.RoleAdmin {
			query = query.Where("company_id = ?", companyID)
		}

		// Apply 'onlyMine' filter for Tech and Admin if requested
		if onlyMine {
			query = query.Where("(responsible_id = ? OR responsible_id IS NULL OR responsible_id = '')", userID)
		}
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if clientID != "" && role != domain.RoleCliente {
		query = query.Where("client_id = ?", clientID)
	}

	if err := query.Find(&requests).Error; err != nil {
		return ServerError(c, err)
	}

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

	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	// Get next sequential number (Company scoped)
	var count int64
	h.DB.Model(&domain.Solicitacao{}).Where("company_id = ?", companyID).Count(&count)
	number := int(count) + 1001

	// Get client name
	var client domain.Cliente
	if err := h.DB.First(&client, "id = ?", req.ClientID).Error; err != nil {
		return NotFound(c, "Cliente não encontrado")
	}

	solicitacao := domain.Solicitacao{
		ID:          uuid.New().String(),
		Numero:      number,
		ClientID:    req.ClientID,
		ClientName:  client.Name,
		CompanyID:   companyID,
		Priority:    req.Priority,
		ServiceType: req.ServiceType,
		Description: req.Description,
		Status:      domain.StatusAberta,
	}

	if req.ScheduledAt != "" {
		if t, err := time.Parse(time.RFC3339, req.ScheduledAt); err == nil {
			solicitacao.ScheduledAt = &t
		}
	}

	// Calculate SLA
	if hours, ok := slaHours[req.Priority]; ok {
		limit := time.Now().Add(time.Duration(hours) * time.Hour)
		solicitacao.SLALimit = limit
	}

	if err := h.DB.Create(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	// Attach equipments
	for _, eqID := range req.EquipmentIDs {
		h.DB.Exec("INSERT INTO solicitacao_equipamentos (solicitacao_id, equipamento_id) VALUES (?, ?)", solicitacao.ID, eqID)
	}

	// Create initial history
	h.createHistoryEntry(solicitacao.ID, userID, "Chamado criado", "Solicitação inicial enviada")

	h.Hub.Broadcast("request:created", solicitacao)

	return Created(c, solicitacao)
}

// GetRequest returns a specific request
func (h *Handler) GetRequest(c *fiber.Ctx) error {
	id := c.Params("id")

	var solicitacao domain.Solicitacao
	// Try finding by UUID or Number
	query := h.DB.Preload("Client").Preload("Equipments").Preload("History").Preload("Checklists").Preload("Attachments").Preload("OrcamentoItens")

	if err := query.Where("id = ? OR numero = ?", id, id).First(&solicitacao).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	return Success(c, solicitacao)
}

// UpdateRequest updates a request
func (h *Handler) UpdateRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var req CreateRequestRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	solicitacao.Priority = req.Priority
	solicitacao.ServiceType = req.ServiceType
	solicitacao.Description = req.Description

	if req.ScheduledAt != "" {
		if t, err := time.Parse(time.RFC3339, req.ScheduledAt); err == nil {
			solicitacao.ScheduledAt = &t
		}
	}

	if err := h.DB.Save(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(solicitacao.ID, userID, "Chamado atualizado", "Dados principais alterados")
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

	var req UpdateRequestDetailsRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	solicitacao.Priority = req.Priority
	if req.ResponsibleID != "" {
		solicitacao.ResponsibleID = &req.ResponsibleID
		solicitacao.ResponsibleName = req.ResponsibleName
	}

	if err := h.DB.Save(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(solicitacao.ID, userID, "Detalhes atualizados", fmt.Sprintf("Prioridade: %s, Responsável: %s", req.Priority, req.ResponsibleName))
	h.Hub.Broadcast("request:updated", solicitacao)

	return Success(c, solicitacao)
}

// UpdateStatusRequest represents status update payload
type UpdateStatusRequest struct {
	Status            string `json:"status"`
	Observation       string `json:"observation,omitempty"`
	MaterialsUsed     string `json:"materialsUsed"`
	NextMaintenanceAt string `json:"nextMaintenanceAt"`
	ScheduledAt       string `json:"scheduledAt"`
	PreventiveDone    bool   `json:"preventiveDone"`
}

// UpdateRequestStatus updates request status
func (h *Handler) UpdateRequestStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	oldStatus := solicitacao.Status
	solicitacao.Status = req.Status
	solicitacao.MaterialsUsed = req.MaterialsUsed

	if req.ScheduledAt != "" {
		if t, err := time.Parse(time.RFC3339, req.ScheduledAt); err == nil {
			solicitacao.ScheduledAt = &t
		}
	}

	if err := h.DB.Save(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(solicitacao.ID, userID, "Status alterado", fmt.Sprintf("De %s para %s. Obs: %s", oldStatus, req.Status, req.Observation))

	h.Hub.Broadcast("request:status_changed", fiber.Map{
		"id":        id,
		"oldStatus": oldStatus,
		"newStatus": req.Status,
		"userId":    userID,
	})

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

	var req AssignRequestRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	solicitacao.ResponsibleID = &req.ResponsibleID
	solicitacao.ResponsibleName = req.ResponsibleName
	if solicitacao.Status == domain.StatusAberta {
		solicitacao.Status = domain.StatusAgendada
	}

	if err := h.DB.Save(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(solicitacao.ID, userID, "Técnico atribuído", fmt.Sprintf("Atribuído a %s", req.ResponsibleName))
	h.Hub.Broadcast("request:assigned", solicitacao)

	return Success(c, solicitacao)
}

// GetRequestHistory returns request history
func (h *Handler) GetRequestHistory(c *fiber.Ctx) error {
	id := c.Params("id")

	var history []domain.SolicitacaoHistorico
	if err := h.DB.Where("solicitacao_id = ?", id).Order("created_at desc").Find(&history).Error; err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, history)
}

// ConfirmRequest allows client to confirm service completion
func (h *Handler) ConfirmRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	solicitacao.Status = domain.StatusConcluida
	now := time.Now()
	solicitacao.ConfirmedAt = &now

	if err := h.DB.Save(&solicitacao).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(solicitacao.ID, userID, "Chamado confirmado", "Finalizado pelo cliente")
	h.Hub.Broadcast("request:confirmed", fiber.Map{"id": id})

	return Success(c, solicitacao)
}

// AcquireLock acquires edit lock on a request
func (h *Handler) AcquireLock(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	now := time.Now()
	if solicitacao.LockedBy != nil && *solicitacao.LockedBy != userID && solicitacao.LockedAt != nil && solicitacao.LockedAt.After(now.Add(-time.Duration(h.Config.LockTimeoutSecs)*time.Second)) {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação bloqueada para edição por outro usuário",
		})
	}

	solicitacao.LockedBy = &userID
	solicitacao.LockedAt = &now

	h.DB.Save(&solicitacao)

	// Get user name for broadcast
	var user domain.User
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

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

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

	var checklists []domain.Checklist
	if err := h.DB.Where("solicitacao_id = ?", requestID).Find(&checklists).Error; err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, checklists)
}

// CreateChecklist creates a new checklist item
func (h *Handler) CreateChecklist(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	var req struct {
		EquipamentoID string `json:"equipamentoId,omitempty"`
		Description   string `json:"description"`
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	item := domain.Checklist{
		ID:            uuid.New().String(),
		SolicitacaoID: requestID,
		Description:   req.Description,
		Checked:       false,
	}
	if req.EquipamentoID != "" {
		item.EquipamentoID = &req.EquipamentoID
	}

	if err := h.DB.Create(&item).Error; err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("checklist:created", item)

	return Created(c, item)
}

// ToggleChecklist toggles a checklist item done status
func (h *Handler) ToggleChecklist(c *fiber.Ctx) error {
	itemID := c.Params("id")

	var req struct {
		Checked bool `json:"checked"`
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var item domain.Checklist
	if err := h.DB.First(&item, "id = ?", itemID).Error; err != nil {
		return NotFound(c, "Item não encontrado")
	}

	item.Checked = req.Checked
	h.DB.Save(&item)

	h.Hub.Broadcast("checklist:updated", item)

	return Success(c, item)
}

// DeleteChecklist deletes a checklist item
func (h *Handler) DeleteChecklist(c *fiber.Ctx) error {
	itemID := c.Params("id")

	if err := h.DB.Delete(&domain.Checklist{}, "id = ?", itemID).Error; err != nil {
		return NotFound(c, "Item não encontrado")
	}

	h.Hub.Broadcast("checklist:deleted", fiber.Map{"id": itemID})

	return Success(c, fiber.Map{"message": "Item removido"})
}

// ListAttachments returns attachments for a request
func (h *Handler) ListAttachments(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	var attachments []domain.Anexo
	if err := h.DB.Where("solicitacao_id = ?", requestID).Find(&attachments).Error; err != nil {
		return Success(c, []interface{}{})
	}

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

	// Save file using Local Storage
	url, err := h.StorageService.Upload(file)
	if err != nil {
		return ServerError(c, err)
	}

	var user domain.User
	h.DB.First(&user, "id = ?", userID)

	attachment := domain.Anexo{
		ID:             uuid.New().String(),
		SolicitacaoID:  requestID,
		FileName:       file.Filename,
		FilePath:       url,
		MimeType:       file.Header.Get("Content-Type"),
		FileSize:       file.Size,
		UploadedByID:   userID,
		UploadedByName: user.Name,
	}

	if err := h.DB.Create(&attachment).Error; err != nil {
		// Physical Rollback: remove file if DB registration fails
		h.StorageService.Delete(url)
		return ServerError(c, err)
	}

	h.Hub.Broadcast("attachment:created", attachment)

	return Created(c, attachment)
}

// DeleteAttachment deletes an attachment
func (h *Handler) DeleteAttachment(c *fiber.Ctx) error {
	id := c.Params("id")

	var attachment domain.Anexo
	if err := h.DB.First(&attachment, "id = ?", id).Error; err != nil {
		return NotFound(c, "Anexo não encontrado")
	}

	// Delete from storage
	go func(path string) {
		if err := h.StorageService.Delete(path); err != nil {
			log.Printf("⚠️ Failed to delete physical file %s: %v", path, err)
		}
	}(attachment.FilePath)

	// Delete from DB
	h.DB.Delete(&attachment)

	h.Hub.Broadcast("attachment:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Anexo removido"})
}

// GetOrcamentoSugestoes returns smart suggestions for AC maintenance budgets
func (h *Handler) GetOrcamentoSugestoes(c *fiber.Ctx) error {
	return Success(c, domain.SugestoesOrcamento)
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

	item := domain.OrcamentoItem{
		ID:            uuid.New().String(),
		SolicitacaoID: requestID,
		Descricao:     req.Descricao,
		Quantidade:    req.Quantidade,
		ValorUnit:     req.ValorUnit,
		ValorTotal:    req.Quantidade * req.ValorUnit,
		Tipo:          req.Tipo,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(requestID, userID, "Item de orçamento adicionado", req.Descricao)

	return Created(c, item)
}

// RemoveOrcamentoItem removes a line item from a budget
func (h *Handler) RemoveOrcamentoItem(c *fiber.Ctx) error {
	itemID := c.Params("itemId")
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	if err := h.DB.Delete(&domain.OrcamentoItem{}, "id = ?", itemID).Error; err != nil {
		return NotFound(c, "Item não encontrado")
	}

	h.createHistoryEntry(requestID, userID, "Item de orçamento removido", "")

	return Success(c, fiber.Map{"message": "Item removido"})
}

// AprovarOrcamento approves a budget
func (h *Handler) AprovarOrcamento(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	h.DB.Model(&domain.Solicitacao{}).Where("id = ?", requestID).Update("orcamento_aprovado", true)

	h.createHistoryEntry(requestID, userID, "Orçamento aprovado", "Aprovado pelo cliente")

	return Success(c, fiber.Map{"message": "Orçamento aprovado"})
}

// SalvarAssinatura saves client or technician signature
func (h *Handler) SalvarAssinatura(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var req struct {
		Assinatura string `json:"assinatura"`
		Tipo       string `json:"tipo"`
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	update := make(map[string]interface{})
	if req.Tipo == "CLIENTE" {
		update["assinatura_cliente"] = req.Assinatura
	} else {
		update["assinatura_tecnico"] = req.Assinatura
	}

	h.DB.Model(&domain.Solicitacao{}).Where("id = ?", requestID).Updates(update)

	h.createHistoryEntry(requestID, userID, "Assinatura salva", "Assinatura do "+req.Tipo)

	return Success(c, fiber.Map{"message": "Assinatura salva"})
}

// Helper to create history entries
func (h *Handler) createHistoryEntry(requestID, userID, action, details string) {
	entry := domain.SolicitacaoHistorico{
		ID:            uuid.New().String(),
		SolicitacaoID: requestID,
		UserID:        userID,
		Action:        action,
		Details:       details,
	}
	h.DB.Create(&entry)
}

// DeleteRequest deletes a request
func (h *Handler) DeleteRequest(c *fiber.Ctx) error {
	id := c.Params("id")

	var solicitacao domain.Solicitacao
	if err := h.DB.First(&solicitacao, "id = ?", id).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Delete in transaction
	tx := h.DB.Begin()

	// Delete attachments and cleanup storage
	var attachments []domain.Anexo
	tx.Where("solicitacao_id = ?", id).Find(&attachments)
	for _, att := range attachments {
		go h.StorageService.Delete(att.FilePath)
	}
	tx.Delete(&domain.Anexo{}, "solicitacao_id = ?", id)

	// Delete other relations
	tx.Delete(&domain.Checklist{}, "solicitacao_id = ?", id)
	tx.Delete(&domain.SolicitacaoHistorico{}, "solicitacao_id = ?", id)
	tx.Delete(&domain.OrcamentoItem{}, "solicitacao_id = ?", id)
	tx.Exec("DELETE FROM solicitacao_equipamentos WHERE solicitacao_id = ?", id)

	// Delete request
	if err := tx.Delete(&solicitacao).Error; err != nil {
		tx.Rollback()
		return ServerError(c, err)
	}

	tx.Commit()

	h.Hub.Broadcast("request:deleted", fiber.Map{"id": id})

	return Success(c, fiber.Map{"message": "Chamado e dados relacionados excluídos com sucesso"})
}

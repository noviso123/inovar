package handlers

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
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
	companyID := middleware.GetCompanyID(c)

	// Query params
	status := c.Query("status")
	priority := c.Query("priority")
	clientID := c.Query("clientId")
	limit := c.Query("limit")
	page := c.Query("page")

	path := fmt.Sprintf("/db/requests?company_id=%s&status=%s&priority=%s&client_id=%s&limit=%s&page=%s", companyID, status, priority, clientID, limit, page)
	if role == domain.RoleAdmin {
		path = fmt.Sprintf("/db/requests?status=%s&priority=%s&client_id=%s&limit=%s&page=%s", status, priority, clientID, limit, page)
	}

	res, err := bridge.CallPyService("GET", path, nil)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, res["data"])
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

	// Delegate to Python
	pyReq := map[string]interface{}{
		"client_id":     req.ClientID,
		"equipment_ids": req.EquipmentIDs,
		"priority":      req.Priority,
		"service_type":  req.ServiceType,
		"description":   req.Description,
		"scheduled_at":  req.ScheduledAt,
		"user_id":       userID,
	}

	res, err := bridge.CallPyService("POST", "/db/requests", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	solData := res["data"]
	h.Hub.Broadcast("request:created", solData)

	// Send Notifications (Email & WhatsApp & In-App) via goroutine or as part of Python service?
	// For now, let's keep it here if we have Go-specific services.
	// But Python should probably handle it for full decoupling.

	return Created(c, solData)
}

// GetRequest returns a specific request (supports both UUID and sequential number)
func (h *Handler) GetRequest(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("GET", "/db/requests/"+id, nil)
	if err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	return Success(c, res["data"])
}

// UpdateRequest updates a request
func (h *Handler) UpdateRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	var req CreateRequestRequest
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	pyReq := map[string]interface{}{
		"priority":     req.Priority,
		"service_type": req.ServiceType,
		"description":  req.Description,
		"scheduled_at": req.ScheduledAt,
		"user_id":      userID,
	}

	res, err := bridge.CallPyService("PUT", "/db/requests/"+id, pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	solData := res["data"]
	h.Hub.Broadcast("request:updated", solData)

	return Success(c, solData)
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

	pyReq := map[string]interface{}{
		"responsible_id":   req.ResponsibleID,
		"responsible_name": req.ResponsibleName,
		"priority":         req.Priority,
		"user_id":          userID,
	}

	res, err := bridge.CallPyService("PATCH", "/db/requests/"+id+"/details", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	solData := res["data"]
	h.Hub.Broadcast("request:updated", solData)

	return Success(c, solData)
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

	pyReq := map[string]interface{}{
		"status":              req.Status,
		"observation":         req.Observation,
		"materials_used":      req.MaterialsUsed,
		"next_maintenance_at": req.NextMaintenanceAt,
		"scheduled_at":        req.ScheduledAt,
		"preventive_done":     req.PreventiveDone,
		"user_id":             userID,
	}

	res, err := bridge.CallPyService("PATCH", "/db/requests/"+id+"/status", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	solData := res["data"].(map[string]interface{})
	h.Hub.Broadcast("request:status_changed", fiber.Map{
		"id":        id,
		"oldStatus": solData["oldStatus"],
		"newStatus": req.Status,
		"userId":    userID,
	})

	return Success(c, solData["solicitacao"])
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

	pyReq := map[string]interface{}{
		"responsible_id":   req.ResponsibleID,
		"responsible_name": req.ResponsibleName,
		"user_id":          userID,
	}
	res, err := bridge.CallPyService("PATCH", "/db/requests/"+id+"/assign", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	solData := res["data"]
	h.Hub.Broadcast("request:assigned", solData)

	return Success(c, solData)
}

// GetRequestHistory returns request history
func (h *Handler) GetRequestHistory(c *fiber.Ctx) error {
	id := c.Params("id")

	res, err := bridge.CallPyService("GET", "/db/requests/"+id+"/history", nil)
	if err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, res["data"])
}

// ConfirmRequest allows client to confirm service completion
func (h *Handler) ConfirmRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	pyReq := map[string]interface{}{"user_id": userID}
	res, err := bridge.CallPyService("POST", "/db/requests/"+id+"/confirm", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("request:confirmed", fiber.Map{"id": id})

	return Success(c, res["data"])
}

// AcquireLock acquires edit lock on a request
func (h *Handler) AcquireLock(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	pyReq := map[string]interface{}{
		"user_id":      userID,
		"timeout_secs": h.Config.LockTimeoutSecs,
	}

	res, err := bridge.CallPyService("POST", "/db/requests/"+id+"/lock", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	// res might be Success=False if locked by someone else
	if success, _ := res["success"].(bool); !success {
		return c.Status(fiber.StatusOK).JSON(res)
	}

	// Get user name for broadcast
	resUser, _ := bridge.CallPyService("GET", "/db/users/"+userID, nil)
	userData := resUser["data"].(map[string]interface{})

	h.Hub.Broadcast("request:locked", fiber.Map{
		"id":         id,
		"lockedBy":   userID,
		"lockedName": userData["name"],
	})

	return Success(c, fiber.Map{"locked": true})
}

// ReleaseLock releases edit lock on a request
func (h *Handler) ReleaseLock(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := middleware.GetUserID(c)

	pyReq := map[string]interface{}{"user_id": userID}
	_, err := bridge.CallPyService("POST", "/db/requests/"+id+"/unlock", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	h.Hub.Broadcast("request:unlocked", fiber.Map{"id": id})

	return Success(c, fiber.Map{"locked": false})
}

// ListChecklists returns checklists for a request
func (h *Handler) ListChecklists(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	res, err := bridge.CallPyService("GET", "/db/checklists/by-request/"+requestID, nil)
	if err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, res["data"])
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

	pyReq := map[string]interface{}{
		"solicitacao_id": requestID,
		"equipamento_id": req.EquipamentoID,
		"description":    req.Description,
	}

	res, err := bridge.CallPyService("POST", "/db/checklists/", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	itemData := res["data"]
	h.Hub.Broadcast("checklist:created", itemData)

	return Created(c, itemData)
}

// DeleteChecklist deletes a checklist item
func (h *Handler) DeleteChecklist(c *fiber.Ctx) error {
	itemID := c.Params("id")

	_, err := bridge.CallPyService("DELETE", "/db/checklists/"+itemID, nil)
	if err != nil {
		return NotFound(c, "Item não encontrado")
	}

	h.Hub.Broadcast("checklist:deleted", fiber.Map{"id": itemID})

	return Success(c, fiber.Map{"message": "Item removido"})
}

// ToggleChecklist toggles a checklist item done status
func (h *Handler) ToggleChecklist(c *fiber.Ctx) error {
	itemID := c.Params("id")

	var req struct {
		Done bool `json:"done"`
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	pyReq := map[string]interface{}{
		"done": req.Done,
	}

	res, err := bridge.CallPyService("PUT", "/db/checklists/"+itemID, pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	itemData := res["data"]
	h.Hub.Broadcast("checklist:updated", itemData)

	return Success(c, itemData)
}

// ListAttachments returns attachments for a request
func (h *Handler) ListAttachments(c *fiber.Ctx) error {
	requestID := c.Params("requestId")

	res, err := bridge.CallPyService("GET", "/db/attachments/by-request/"+requestID, nil)
	if err != nil {
		return Success(c, []interface{}{})
	}

	return Success(c, res["data"])
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

	// Get user via bridge
	resUser, _ := bridge.CallPyService("GET", "/db/users/"+userID, nil)
	userData := resUser["data"].(map[string]interface{})

	pyReq := map[string]interface{}{
		"solicitacao_id":   requestID,
		"file_name":        file.Filename,
		"file_path":        url,
		"mime_type":        file.Header.Get("Content-Type"),
		"file_size":        file.Size,
		"uploaded_by_id":   userID,
		"uploaded_by_name": userData["name"],
	}

	res, err := bridge.CallPyService("POST", "/db/attachments/", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	attachmentData := res["data"]
	h.Hub.Broadcast("attachment:created", attachmentData)

	return Created(c, attachmentData)
}

// DeleteAttachment deletes an attachment
func (h *Handler) DeleteAttachment(c *fiber.Ctx) error {
	id := c.Params("id")

	_, err := bridge.CallPyService("DELETE", "/db/attachments/"+id, nil)
	if err != nil {
		return NotFound(c, "Anexo não encontrado")
	}

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

	pyReq := map[string]interface{}{
		"solicitacao_id": requestID,
		"descricao":      req.Descricao,
		"quantidade":     req.Quantidade,
		"valor_unit":     req.ValorUnit,
		"tipo":           req.Tipo,
	}

	res, err := bridge.CallPyService("POST", "/db/budgets/", pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	// Update audit log or history via bridge if needed
	bridge.CallPyService("POST", "/db/requests/history", map[string]interface{}{
		"solicitacao_id": requestID,
		"user_id":        userID,
		"action":         "Item de orçamento adicionado",
		"details":        req.Descricao,
	})

	return Created(c, res["data"])
}

// RemoveOrcamentoItem removes a line item from a budget
func (h *Handler) RemoveOrcamentoItem(c *fiber.Ctx) error {
	itemID := c.Params("itemId")
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	_, err := bridge.CallPyService("DELETE", "/db/budgets/"+itemID, nil)
	if err != nil {
		return NotFound(c, "Item não encontrado")
	}

	bridge.CallPyService("POST", "/db/requests/history", map[string]interface{}{
		"solicitacao_id": requestID,
		"user_id":        userID,
		"action":         "Item de orçamento removido",
	})

	return Success(c, fiber.Map{"message": "Item removido"})
}

// AprovarOrcamento approves a budget
func (h *Handler) AprovarOrcamento(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	pyReq := map[string]interface{}{
		"orcamento_aprovado": true,
	}

	_, err := bridge.CallPyService("PATCH", "/db/requests/"+requestID, pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	bridge.CallPyService("POST", "/db/requests/history", map[string]interface{}{
		"solicitacao_id": requestID,
		"user_id":        userID,
		"action":         "Orçamento aprovado pelo cliente",
	})

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

	pyReq := map[string]interface{}{}
	if req.Tipo == "CLIENTE" {
		pyReq["assinatura_cliente"] = req.Assinatura
	} else {
		pyReq["assinatura_tecnico"] = req.Assinatura
	}

	_, err := bridge.CallPyService("PATCH", "/db/requests/"+requestID, pyReq)
	if err != nil {
		return ServerError(c, err)
	}

	bridge.CallPyService("POST", "/db/requests/history", map[string]interface{}{
		"solicitacao_id": requestID,
		"user_id":        userID,
		"action":         "Assinatura salva",
		"details":        "Assinatura do " + req.Tipo,
	})

	return Success(c, fiber.Map{"message": "Assinatura salva"})
}

// Helper to create history entries
func (h *Handler) createHistoryEntry(requestID, userID, description string) {
	pyReq := map[string]interface{}{
		"solicitacao_id": requestID,
		"user_id":        userID,
		"action":         "UPDATE",
		"details":        description,
	}
	bridge.CallPyService("POST", "/db/requests/history", pyReq)
}

// DeleteRequest deletes a request
func (h *Handler) DeleteRequest(c *fiber.Ctx) error {
	id := c.Params("id")

	// 1. Fetch Attachments for storage cleanup BEFORE deleting from DB
	resAtt, err := bridge.CallPyService("GET", "/db/attachments/by-request/"+id, nil)
	if err == nil {
		if data, ok := resAtt["data"].([]interface{}); ok {
			for _, item := range data {
				if att, ok := item.(map[string]interface{}); ok {
					if path, ok := att["file_path"].(string); ok {
						go h.StorageService.Delete(path)
					}
				}
			}
		}
	}

	// 2. Delegate all DB deletion to Python
	_, err = bridge.CallPyService("DELETE", "/db/requests/"+id, nil)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, fiber.Map{"message": "Chamado e dados relacionados excluídos com sucesso"})
}

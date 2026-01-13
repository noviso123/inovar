package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
)

// UploadCertificate uploads a digital certificate (A1)
func (h *Handler) UploadCertificate(c *fiber.Ctx) error {
	// Implementation would involve saving the pfx file safely
	// For now we will mock the storage

	userID := middleware.GetUserID(c)
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return NotFound(c, "Usuário não encontrado")
	}

	if user.CompanyID == nil {
		return BadRequest(c, "Usuário não vinculado a uma empresa")
	}

	file, err := c.FormFile("certificate")
	if err != nil {
		return BadRequest(c, "Certificado não enviado")
	}

	password := c.FormValue("password")
	if password == "" {
		return BadRequest(c, "Senha do certificado obrigatória")
	}

	// In a real app, encrypt the file and password
	// Save file to secure storage...

	cert := models.CertificadoDigital{
		ID:          uuid.New().String(),
		PrestadorID: *user.CompanyID,
		Nome:        file.Filename,
		Tipo:        "A1",
		Validade:    time.Now().AddDate(1, 0, 0), // Mock 1 year validity
		Ativo:       true,
		CreatedAt:   time.Now(),
	}

	// Upsert: Deactivate old ones
	h.DB.Model(&models.CertificadoDigital{}).Where("prestador_id = ?", *user.CompanyID).Update("ativo", false)

	if err := h.DB.Create(&cert).Error; err != nil {
		return ServerError(c, err)
	}

	return Created(c, cert)
}

// GetFiscalConfig returns fiscal configuration
func (h *Handler) GetFiscalConfig(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	if user.CompanyID == nil {
		return BadRequest(c, "Empresa não encontrada")
	}

	var config models.ConfiguracaoFiscal
	if err := h.DB.First(&config, "prestador_id = ?", *user.CompanyID).Error; err != nil {
		// Return empty default if not found
		return Success(c, models.ConfiguracaoFiscal{PrestadorID: *user.CompanyID})
	}

	return Success(c, config)
}

// UpdateFiscalConfig updates fiscal configuration
func (h *Handler) UpdateFiscalConfig(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var user models.User
	h.DB.First(&user, "id = ?", userID)

	if user.CompanyID == nil {
		return BadRequest(c, "Empresa não encontrada")
	}

	var req models.ConfiguracaoFiscal
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var config models.ConfiguracaoFiscal
	result := h.DB.First(&config, "prestador_id = ?", *user.CompanyID)

	if result.Error != nil {
		// Create new
		config = req
		config.ID = uuid.New().String()
		config.PrestadorID = *user.CompanyID
		config.CreatedAt = time.Now()
		h.DB.Create(&config)
	} else {
		// Update existing
		h.DB.Model(&config).Updates(req)
	}

	return Success(c, config)
}

// IssueNFSe issues an invoice for a completed request
func (h *Handler) IssueNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.Preload("Client").Preload("OrcamentoItens").First(&solicitacao, "id = ?", requestID).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Validations
	if solicitacao.Status != models.StatusConcluida {
		return BadRequest(c, "Solicitação deve estar CONCLUÍDA para emitir NFSe")
	}
	if solicitacao.ValorOrcamento <= 0 {
		return BadRequest(c, "Solicitação sem valor definido")
	}

	// Create NFSe record
	nfse := models.NotaFiscal{
		ID:               uuid.New().String(),
		SolicitacaoID:    solicitacao.ID,
		PrestadorID:      solicitacao.Client.CompanyID, // Client belongs to this provider company
		TomadorNome:      solicitacao.ClientName,
		TomadorDocumento: solicitacao.Client.Document,
		ValorServicos:    solicitacao.ValorOrcamento,
		ValorLiquido:     solicitacao.ValorOrcamento, // Simplified tax logic
		Status:           models.NFSeStatusProcessando,
		Discriminacao:    "Serviços de Manutenção de Ar Condicionado Ref: Chamado #" + requestID,
		CodigoServico:    "14.01", // Default Maintenance
		DataCompetencia:  time.Now(),
		CreatedAt:        time.Now(),
	}

	if err := h.DB.Create(&nfse).Error; err != nil {
		return ServerError(c, err)
	}

	// Mock Async Processing
	go func() {
		time.Sleep(2 * time.Second)
		h.DB.Model(&nfse).Updates(map[string]interface{}{
			"status":             models.NFSeStatusEmitida,
			"numero":             "2024" + requestID[:4],
			"codigo_verificacao": uuid.New().String()[:8],
			"data_emissao":       time.Now(),
		})
		h.createHistoryEntry(requestID, userID, "Nota Fiscal emitida: "+nfse.Numero)
	}()

	return Created(c, nfse)
}

// GetNFSe returns the NFSe for a request
func (h *Handler) GetNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")

	var nfse models.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	return Success(c, nfse)
}

package handlers

import (
	"fmt"
	"time"

	"inovar/internal/api/middleware"
	"inovar/internal/domain"
	"inovar/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// UploadCertificate uploads a digital certificate (A1)
func (h *Handler) UploadCertificate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var user domain.User
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

	// Save certificate using Local Storage
	url, err := h.StorageService.Upload(file)
	if err != nil {
		return ServerError(c, err)
	}

	// In a real app, encrypt the file and password
	// Save file to secure storage...

	cert := domain.CertificadoDigital{
		ID:          uuid.New().String(),
		PrestadorID: *user.CompanyID,
		Nome:        file.Filename,
		CertPath:    url, // Store the path
		Tipo:        "A1",
		Validade:    time.Now().AddDate(1, 0, 0),
		Ativo:       true,
		CreatedAt:   time.Now(),
	}

	// Upsert: Deactivate old ones
	h.DB.Model(&domain.CertificadoDigital{}).Where("prestador_id = ?", *user.CompanyID).Update("ativo", false)

	if err := h.DB.Create(&cert).Error; err != nil {
		return ServerError(c, err)
	}

	return Created(c, cert)
}

// GetFiscalConfig returns fiscal configuration
func (h *Handler) GetFiscalConfig(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var user domain.User
	h.DB.First(&user, "id = ?", userID)

	if user.CompanyID == nil {
		return BadRequest(c, "Empresa não encontrada")
	}

	var config domain.ConfiguracaoFiscal
	if err := h.DB.First(&config, "prestador_id = ?", *user.CompanyID).Error; err != nil {
		// Return empty default if not found
		return Success(c, domain.ConfiguracaoFiscal{PrestadorID: *user.CompanyID})
	}

	return Success(c, config)
}

// UpdateFiscalConfig updates fiscal configuration
func (h *Handler) UpdateFiscalConfig(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var user domain.User
	h.DB.First(&user, "id = ?", userID)

	if user.CompanyID == nil {
		return BadRequest(c, "Empresa não encontrada")
	}

	var req domain.ConfiguracaoFiscal
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	var config domain.ConfiguracaoFiscal
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
// Uses NFS-e Nacional (GOV.BR) when certificate is configured
func (h *Handler) IssueNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao domain.Solicitacao
	if err := h.DB.Preload("Client").Preload("Client.Endereco").Preload("OrcamentoItens").First(&solicitacao, "id = ?", requestID).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Validations
	if solicitacao.Status != domain.StatusFinalizada {
		return BadRequest(c, "Solicitação deve estar CONCLUÍDA para emitir NFSe")
	}
	if solicitacao.ValorOrcamento <= 0 {
		return BadRequest(c, "Solicitação sem valor definido")
	}

	// Get company info
	var prestador domain.Prestador
	if err := h.DB.First(&prestador, "id = ?", solicitacao.Client.CompanyID).Error; err != nil {
		return BadRequest(c, "Empresa prestadora não encontrada")
	}

	// Get fiscal config
	var fiscalConfig domain.ConfiguracaoFiscal
	h.DB.First(&fiscalConfig, "prestador_id = ?", prestador.ID)

	// Get active certificate
	var certificate domain.CertificadoDigital
	hasCert := h.DB.First(&certificate, "prestador_id = ? AND ativo = ?", prestador.ID, true).Error == nil

	// AUTOMATIC TAX CALCULATION using TaxCalculationService
	taxService := services.NewTaxCalculationService()
	taxResult := taxService.Calculate(solicitacao.ValorOrcamento, 0, &fiscalConfig)

	// Create NFSe record with calculated values
	nfse := domain.NotaFiscal{
		ID:               uuid.New().String(),
		SolicitacaoID:    solicitacao.ID,
		PrestadorID:      prestador.ID,
		TomadorNome:      solicitacao.ClientName,
		TomadorDocumento: solicitacao.Client.Document,
		ValorServicos:    taxResult.ValorServicos,
		ValorDeducoes:    taxResult.ValorDeducoes,
		ValorLiquido:     taxResult.ValorLiquido,
		AliquotaISS:      taxResult.AliquotaISS,
		ValorISS:         taxResult.ValorISS,
		ValorPIS:         taxResult.ValorPIS,
		ValorCOFINS:      taxResult.ValorCOFINS,
		ValorCSLL:        taxResult.ValorCSLL,
		ValorIR:          taxResult.ValorIRPJ, // Mapping IRPJ to ValorIR
		ValorINSS:        taxResult.ValorINSS,
		Status:           domain.NFSeStatusProcessando,
		Discriminacao:    "Serviços de Manutenção de Ar Condicionado - Chamado #" + requestID[:8],
		CodigoServico:    fiscalConfig.CodigoServico,
		CNAE:             fiscalConfig.CNAE,
		DataCompetencia:  time.Now(),
		CreatedAt:        time.Now(),
	}

	// Requirement: 100% Real - Nothing Simulated
	if !hasCert || prestador.CNPJ == "" {
		return BadRequest(c, "NFS-e não pôde ser emitida: Certificado Digital ou CNPJ não configurado.")
	}

	if err := h.DB.Create(&nfse).Error; err != nil {
		return ServerError(c, err)
	}

	// Create emission event
	evento := domain.NFSeEvento{
		ID:     uuid.New().String(),
		NFSeID: nfse.ID,
		Tipo:   domain.NFSeEventoEmissao,
		Status: domain.NFSeStatusProcessando,
		Mensagem: fmt.Sprintf("Regime: %s | ISS: %.2f%% | Total Tributos: R$ %.2f",
			taxResult.RegimeTributario, taxResult.AliquotaISS, taxResult.TotalTributos),
		UserID:    userID,
		CreatedAt: time.Now(),
	}
	h.DB.Create(&evento)

	// Process NFSe asynchronously (Real Flow Only)
	go func() {
		var resultado string
		// Use NFS-e Nacional (GOV.BR)
		errEmissao := h.emitirNFSeNacional(&nfse, &prestador, &solicitacao, &fiscalConfig, certificate.CertPath)
		if errEmissao == nil {
			resultado = "NFS-e emitida com sucesso via GOV.BR Nacional"
		} else {
			resultado = "Erro na emissão: " + errEmissao.Error()
			h.DB.Model(&nfse).Update("status", domain.NFSeStatusErro)
		}

		h.createHistoryEntry(requestID, userID, resultado)
	}()

	return Created(c, fiber.Map{
		"nfse":        nfse,
		"mensagem":    "NFS-e em processamento via GOV.BR Nacional.",
		"usandoGovBR": true,
	})
}

// emitirNFSeNacional emits NFS-e using GOV.BR Nacional API
func (h *Handler) emitirNFSeNacional(
	nfse *domain.NotaFiscal,
	prestador *domain.Prestador,
	solicitacao *domain.Solicitacao,
	fiscalConfig *domain.ConfiguracaoFiscal,
	certPath string,
) error {
	// Build tomador address
	var tomadorEnd services.EnderecoNFSe
	if solicitacao.Client.Endereco != nil {
		end := solicitacao.Client.Endereco
		tomadorEnd = services.EnderecoNFSe{
			XLgr:    end.Street,
			Nro:     end.Number,
			XCpl:    end.Complement,
			XBairro: end.District,
			UF:      end.State,
			CEP:     end.ZipCode,
			CMun:    services.GetCodigoMunicipioIBGE(end.City, end.State),
		}
	}

	// Get municipality code
	codMunEmissao := fiscalConfig.CodigoMunicipio
	if codMunEmissao == 0 {
		codMunEmissao = services.GetCodigoMunicipioIBGE("SERRA", "ES") // Fallback
	}

	// Build DPS
	dps := services.BuildDPSFromRequest(
		prestador.CNPJ,
		fiscalConfig.InscricaoMunicipal,
		solicitacao.Client.Document,
		solicitacao.ClientName,
		tomadorEnd,
		nfse.Discriminacao,
		fiscalConfig.CodigoServico,
		nfse.ValorServicos,
		codMunEmissao,
		tomadorEnd.CMun,
		fiscalConfig.NaturezaOperacao,
		fiscalConfig.CNAE,
	)

	// Map tax values to DPS
	if dps.InfDPS.Valores.VTDC != nil {
		dps.InfDPS.Valores.VTDC.PAliqTot = nfse.AliquotaISS
		dps.InfDPS.Valores.VTDC.VISSQNCalc = nfse.ValorISS
		// Map withholdings (if any)
		// These would be calculated in taxService and saved in nfse record if we had those fields
	}

	// Create NFS-e service
	ambiente := fiscalConfig.Ambiente
	if ambiente == "" {
		ambiente = services.AmbienteHomologacao // Default to homologation
	}

	nfseService := services.NewNFSeNacionalService(h.Config, ambiente)

	// Emit NFS-e via Bridge
	response, err := nfseService.EmitirNFSe(dps, certPath)
	if err != nil {
		h.DB.Model(nfse).Updates(map[string]interface{}{
			"status":        domain.NFSeStatusErro,
			"mensagem_erro": err.Error(),
		})
		return err
	}

	// Update with response data
	dataEmissao := time.Now()
	if response.DataEmissao != "" {
		if parsed, err := time.Parse(time.RFC3339, response.DataEmissao); err == nil {
			dataEmissao = parsed
		}
	}

	h.DB.Model(nfse).Updates(map[string]interface{}{
		"status":             domain.NFSeStatusEmitida,
		"numero":             response.NumeroNFSe,
		"codigo_verificacao": response.CodigoVerificacao,
		"data_emissao":       dataEmissao,
		"xml_path":           response.ChaveAcesso, // Store access key for retrieval
	})

	return nil
}

// GetNFSe returns the NFSe for a request
func (h *Handler) GetNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")

	var nfse domain.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	return Success(c, nfse)
}

// CancelNFSe cancels an issued invoice
func (h *Handler) CancelNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var nfse domain.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	if nfse.Status == domain.NFSeStatusCancelada {
		return BadRequest(c, "Nota Fiscal já está cancelada")
	}

	// In production: Call GOV.BR Nacional API for cancellation via Bridge
	nfseService := services.NewNFSeNacionalService(h.Config, services.AmbienteHomologacao)

	// Get active certificate for company
	var certificate domain.CertificadoDigital
	h.DB.First(&certificate, "prestador_id = ? AND ativo = ?", nfse.PrestadorID, true)

	if err := nfseService.CancelarNFSe(nfse.XMLPath, "Cancelamento solicitado pelo usuário", certificate.CertPath); err != nil {
		return ServerError(c, err)
	}

	nfse.Status = domain.NFSeStatusCancelada
	nfse.UpdatedAt = time.Now()

	if err := h.DB.Save(&nfse).Error; err != nil {
		return ServerError(c, err)
	}

	h.createHistoryEntry(requestID, userID, "Nota Fiscal cancelada: "+nfse.Numero)

	return Success(c, nfse)
}

// GetDANFSe returns the DANFS-e (Documento Auxiliar) HTML for printing
func (h *Handler) GetDANFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")

	var nfse domain.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	if nfse.Status != domain.NFSeStatusEmitida {
		return BadRequest(c, "NFS-e ainda não foi emitida")
	}

	// Get prestador with address
	var prestador domain.Prestador
	h.DB.Preload("Endereco").First(&prestador, "id = ?", nfse.PrestadorID)

	// Get cliente/tomador
	var solicitacao domain.Solicitacao
	h.DB.Preload("Client").First(&solicitacao, "id = ?", requestID)

	// Generate DANFS-e
	danfseService := services.NewDANFSeService(h.Config)
	html, err := danfseService.Generate(&nfse, &prestador, &solicitacao.Client)
	if err != nil {
		return ServerError(c, err)
	}

	// Return as HTML or base64 depending on format param
	format := c.Query("format", "html")
	if format == "base64" {
		return Success(c, fiber.Map{
			"html":   html,
			"base64": true,
		})
	}

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

// CalculateTaxes calculates taxes automatically based on fiscal configuration
func (h *Handler) CalculateTaxes(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var user domain.User
	h.DB.First(&user, "id = ?", userID)

	if user.CompanyID == nil {
		return BadRequest(c, "Empresa não encontrada")
	}

	// Parse request
	var req struct {
		ValorServicos float64 `json:"valorServicos"`
		ValorDeducoes float64 `json:"valorDeducoes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	// Get fiscal config
	var fiscalConfig domain.ConfiguracaoFiscal
	h.DB.First(&fiscalConfig, "prestador_id = ?", *user.CompanyID)

	// Calculate taxes
	taxService := services.NewTaxCalculationService()
	result := taxService.Calculate(req.ValorServicos, req.ValorDeducoes, &fiscalConfig)

	return Success(c, fiber.Map{
		"calculo": result,
		"config":  fiscalConfig,
	})
}

// GetNFSeEventos returns the event history for an NFS-e
func (h *Handler) GetNFSeEventos(c *fiber.Ctx) error {
	requestID := c.Params("id")

	var nfse domain.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	var eventos []domain.NFSeEvento
	h.DB.Where("nfse_id = ?", nfse.ID).Order("created_at desc").Find(&eventos)

	return Success(c, eventos)
}

// CancelNFSeWithMotivo cancels an NFS-e with a specific reason
func (h *Handler) CancelNFSeWithMotivo(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var req struct {
		Motivo       string `json:"motivo"`
		CodigoMotivo string `json:"codigoMotivo"` // 1, 2, 3, or 4 per GOV.BR
	}
	if err := c.BodyParser(&req); err != nil {
		return BadRequest(c, "Dados inválidos")
	}

	if req.Motivo == "" {
		return BadRequest(c, "Motivo do cancelamento é obrigatório")
	}

	var nfse domain.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	if nfse.Status == domain.NFSeStatusCancelada {
		return BadRequest(c, "Nota Fiscal já está cancelada")
	}

	// In production: Call GOV.BR Nacional API for cancellation
	// For now, update status locally

	now := time.Now()
	nfse.Status = domain.NFSeStatusCancelada
	nfse.MensagemErro = "Cancelada: " + req.Motivo
	nfse.UpdatedAt = now

	if err := h.DB.Save(&nfse).Error; err != nil {
		return ServerError(c, err)
	}

	// Create event record
	evento := domain.NFSeEvento{
		ID:        uuid.New().String(),
		NFSeID:    nfse.ID,
		Tipo:      domain.NFSeEventoCancelamento,
		Status:    "CANCELADA",
		Motivo:    req.Motivo,
		Mensagem:  "Código: " + req.CodigoMotivo,
		UserID:    userID,
		CreatedAt: now,
	}
	h.DB.Create(&evento)

	h.createHistoryEntry(requestID, userID, "NFS-e cancelada: "+req.Motivo)

	return Success(c, fiber.Map{
		"nfse":   nfse,
		"evento": evento,
	})
}

// GetTaxRegimes returns available tax regimes for configuration
func (h *Handler) GetTaxRegimes(c *fiber.Ctx) error {
	regimes := []fiber.Map{
		{
			"id":          domain.RegimeMEI,
			"nome":        "MEI - Microempreendedor Individual",
			"descricao":   "Faturamento até R$ 81.000/ano. Imposto fixo mensal via DAS.",
			"limiteAnual": 81000,
		},
		{
			"id":          domain.RegimeSimplesNac,
			"nome":        "Simples Nacional",
			"descricao":   "Regime simplificado com alíquotas progressivas. Até R$ 4.8M/ano.",
			"limiteAnual": 4800000,
			"faixas": []fiber.Map{
				{"id": domain.SimplesNacFaixa1, "limite": 180000, "aliquota": 6.0},
				{"id": domain.SimplesNacFaixa2, "limite": 360000, "aliquota": 11.2},
				{"id": domain.SimplesNacFaixa3, "limite": 720000, "aliquota": 13.5},
				{"id": domain.SimplesNacFaixa4, "limite": 1800000, "aliquota": 16.0},
				{"id": domain.SimplesNacFaixa5, "limite": 3600000, "aliquota": 21.0},
				{"id": domain.SimplesNacFaixa6, "limite": 4800000, "aliquota": 33.0},
			},
		},
		{
			"id":        domain.RegimeLucroPresumido,
			"nome":      "Lucro Presumido",
			"descricao": "Base presumida 32% para serviços. PIS 0.65%, COFINS 3%.",
		},
		{
			"id":        domain.RegimeLucroReal,
			"nome":      "Lucro Real",
			"descricao": "Tributos sobre lucro contábil real. PIS 1.65%, COFINS 7.6% (não-cumulativo).",
		},
		{
			"id":        domain.RegimeImune,
			"nome":      "Imune",
			"descricao": "Entidade imune (Art. 150, VI, CF/88).",
		},
		{
			"id":        domain.RegimeIsento,
			"nome":      "Isento",
			"descricao": "Isento conforme legislação específica.",
		},
	}

	motivosCancelamento := []fiber.Map{
		{"codigo": domain.MotivoCancelErroEmissao, "descricao": "Erro na Emissão"},
		{"codigo": domain.MotivoCancelServNaoRealizado, "descricao": "Serviço não Prestado"},
		{"codigo": domain.MotivoCancelDuplicidade, "descricao": "Duplicidade de Nota"},
		{"codigo": domain.MotivoCancelErroPreenchimento, "descricao": "Erro de Preenchimento"},
	}

	return Success(c, fiber.Map{
		"regimes":             regimes,
		"motivosCancelamento": motivosCancelamento,
	})
}

// LookupCNPJ looks up company data by CNPJ
func (h *Handler) LookupCNPJ(c *fiber.Ctx) error {
	cnpj := c.Params("cnpj")
	if cnpj == "" {
		return BadRequest(c, "CNPJ é obrigatório")
	}

	taxService := services.NewTaxCalculationService()
	data, err := taxService.LookupCNPJ(cnpj)
	if err != nil {
		return BadRequest(c, err.Error())
	}

	return Success(c, data)
}

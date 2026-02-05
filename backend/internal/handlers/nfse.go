package handlers

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
	"github.com/inovar/backend/internal/services"
	"github.com/inovar/backend/internal/utils"
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

	// Save certificate using structured storage
	// Category: certificados, Subfolder: companyID
	url, err := utils.SaveFile(c, file, "certificados", *user.CompanyID)
	if err != nil {
		return ServerError(c, err)
	}

	// In a real app, encrypt the file and password
	// Save file to secure storage...

	cert := models.CertificadoDigital{
		ID:          uuid.New().String(),
		PrestadorID: *user.CompanyID,
		Nome:        file.Filename,
		CertPath:    url, // Store the path
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
// Uses NFS-e Nacional (GOV.BR) when certificate is configured
func (h *Handler) IssueNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var solicitacao models.Solicitacao
	if err := h.DB.Preload("Client").Preload("Client.Endereco").Preload("OrcamentoItens").First(&solicitacao, "id = ?", requestID).Error; err != nil {
		return NotFound(c, "Solicitação não encontrada")
	}

	// Validations
	if solicitacao.Status != models.StatusFinalizada {
		return BadRequest(c, "Solicitação deve estar CONCLUÍDA para emitir NFSe")
	}
	if solicitacao.ValorOrcamento <= 0 {
		return BadRequest(c, "Solicitação sem valor definido")
	}

	// Get company info
	var prestador models.Prestador
	if err := h.DB.First(&prestador, "id = ?", solicitacao.Client.CompanyID).Error; err != nil {
		return BadRequest(c, "Empresa prestadora não encontrada")
	}

	// Get fiscal config
	var fiscalConfig models.ConfiguracaoFiscal
	h.DB.First(&fiscalConfig, "prestador_id = ?", prestador.ID)

	// Get active certificate
	var certificate models.CertificadoDigital
	hasCert := h.DB.First(&certificate, "prestador_id = ? AND ativo = ?", prestador.ID, true).Error == nil

	// AUTOMATIC TAX CALCULATION using TaxCalculationService
	taxService := services.NewTaxCalculationService()
	taxResult := taxService.Calculate(solicitacao.ValorOrcamento, 0, &fiscalConfig)

	// Create NFSe record with calculated values
	nfse := models.NotaFiscal{
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
		Status:           models.NFSeStatusProcessando,
		Discriminacao:    "Serviços de Manutenção de Ar Condicionado - Chamado #" + requestID[:8],
		CodigoServico:    fiscalConfig.CodigoServico,
		CNAE:             fiscalConfig.CNAE,
		DataCompetencia:  time.Now(),
		CreatedAt:        time.Now(),
	}

	if err := h.DB.Create(&nfse).Error; err != nil {
		return ServerError(c, err)
	}

	// Create emission event
	evento := models.NFSeEvento{
		ID:     uuid.New().String(),
		NFSeID: nfse.ID,
		Tipo:   models.NFSeEventoEmissao,
		Status: models.NFSeStatusProcessando,
		Mensagem: fmt.Sprintf("Regime: %s | ISS: %.2f%% | Total Tributos: R$ %.2f",
			taxResult.RegimeTributario, taxResult.AliquotaISS, taxResult.TotalTributos),
		UserID:    userID,
		CreatedAt: time.Now(),
	}
	h.DB.Create(&evento)

	// Process NFSe asynchronously
	go func() {
		var resultado string
		var errEmissao error

		if hasCert && prestador.CNPJ != "" {
			// Use NFS-e Nacional (GOV.BR)
			errEmissao = h.emitirNFSeNacional(&nfse, &prestador, &solicitacao, &fiscalConfig, certificate.CertPath)
			if errEmissao == nil {
				resultado = "NFS-e emitida via GOV.BR Nacional"
			} else {
				resultado = "Erro na emissão: " + errEmissao.Error()
			}
		} else {
			// Simulated mode (no certificate)
			time.Sleep(2 * time.Second)
			h.DB.Model(&nfse).Updates(map[string]interface{}{
				"status":             models.NFSeStatusEmitida,
				"numero":             time.Now().Format("20060102") + requestID[:4],
				"codigo_verificacao": uuid.New().String()[:8],
				"data_emissao":       time.Now(),
			})
			resultado = "NFS-e simulada (certificado não configurado)"
		}

		h.createHistoryEntry(requestID, userID, resultado)
	}()

	return Created(c, fiber.Map{
		"nfse":        nfse,
		"mensagem":    "NFS-e em processamento. Aguarde a confirmação.",
		"usandoGovBR": hasCert,
	})
}

// emitirNFSeNacional emits NFS-e using GOV.BR Nacional API
func (h *Handler) emitirNFSeNacional(
	nfse *models.NotaFiscal,
	prestador *models.Prestador,
	solicitacao *models.Solicitacao,
	fiscalConfig *models.ConfiguracaoFiscal,
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

	// Configure mTLS with certificate
	// Note: In production, you'd need the certificate password stored securely
	certPassword := "" // Should be stored encrypted
	if err := nfseService.ConfigureMTLS(certPath, certPassword); err != nil {
		// Fallback to simulation if certificate config fails
		h.DB.Model(nfse).Updates(map[string]interface{}{
			"status":        models.NFSeStatusErro,
			"mensagem_erro": "Erro ao configurar certificado: " + err.Error(),
		})
		return err
	}

	// Emit NFS-e
	response, err := nfseService.EmitirNFSe(dps)
	if err != nil {
		h.DB.Model(nfse).Updates(map[string]interface{}{
			"status":        models.NFSeStatusErro,
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
		"status":             models.NFSeStatusEmitida,
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

	var nfse models.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	return Success(c, nfse)
}

// CancelNFSe cancels an issued invoice
func (h *Handler) CancelNFSe(c *fiber.Ctx) error {
	requestID := c.Params("id")
	userID := middleware.GetUserID(c)

	var nfse models.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	if nfse.Status == models.NFSeStatusCancelada {
		return BadRequest(c, "Nota Fiscal já está cancelada")
	}

	// In a real scenario, we would call the GOV.BR Nacional API here.
	// For now, we just update the status.

	nfse.Status = models.NFSeStatusCancelada
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

	var nfse models.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	if nfse.Status != models.NFSeStatusEmitida {
		return BadRequest(c, "NFS-e ainda não foi emitida")
	}

	// Get prestador with address
	var prestador models.Prestador
	h.DB.Preload("Endereco").First(&prestador, "id = ?", nfse.PrestadorID)

	// Get cliente/tomador
	var solicitacao models.Solicitacao
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
	var user models.User
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
	var fiscalConfig models.ConfiguracaoFiscal
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

	var nfse models.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	var eventos []models.NFSeEvento
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

	var nfse models.NotaFiscal
	if err := h.DB.First(&nfse, "solicitacao_id = ?", requestID).Error; err != nil {
		return NotFound(c, "Nota Fiscal não encontrada")
	}

	if nfse.Status == models.NFSeStatusCancelada {
		return BadRequest(c, "Nota Fiscal já está cancelada")
	}

	// In production: Call GOV.BR Nacional API for cancellation
	// For now, update status locally

	now := time.Now()
	nfse.Status = models.NFSeStatusCancelada
	nfse.MensagemErro = "Cancelada: " + req.Motivo
	nfse.UpdatedAt = now

	if err := h.DB.Save(&nfse).Error; err != nil {
		return ServerError(c, err)
	}

	// Create event record
	evento := models.NFSeEvento{
		ID:        uuid.New().String(),
		NFSeID:    nfse.ID,
		Tipo:      models.NFSeEventoCancelamento,
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
			"id":          models.RegimeMEI,
			"nome":        "MEI - Microempreendedor Individual",
			"descricao":   "Faturamento até R$ 81.000/ano. Imposto fixo mensal via DAS.",
			"limiteAnual": 81000,
		},
		{
			"id":          models.RegimeSimplesNac,
			"nome":        "Simples Nacional",
			"descricao":   "Regime simplificado com alíquotas progressivas. Até R$ 4.8M/ano.",
			"limiteAnual": 4800000,
			"faixas": []fiber.Map{
				{"id": models.SimplesNacFaixa1, "limite": 180000, "aliquota": 6.0},
				{"id": models.SimplesNacFaixa2, "limite": 360000, "aliquota": 11.2},
				{"id": models.SimplesNacFaixa3, "limite": 720000, "aliquota": 13.5},
				{"id": models.SimplesNacFaixa4, "limite": 1800000, "aliquota": 16.0},
				{"id": models.SimplesNacFaixa5, "limite": 3600000, "aliquota": 21.0},
				{"id": models.SimplesNacFaixa6, "limite": 4800000, "aliquota": 33.0},
			},
		},
		{
			"id":        models.RegimeLucroPresumido,
			"nome":      "Lucro Presumido",
			"descricao": "Base presumida 32% para serviços. PIS 0.65%, COFINS 3%.",
		},
		{
			"id":        models.RegimeLucroReal,
			"nome":      "Lucro Real",
			"descricao": "Tributos sobre lucro contábil real. PIS 1.65%, COFINS 7.6% (não-cumulativo).",
		},
		{
			"id":        models.RegimeImune,
			"nome":      "Imune",
			"descricao": "Entidade imune (Art. 150, VI, CF/88).",
		},
		{
			"id":        models.RegimeIsento,
			"nome":      "Isento",
			"descricao": "Isento conforme legislação específica.",
		},
	}

	motivosCancelamento := []fiber.Map{
		{"codigo": models.MotivoCancelErroEmissao, "descricao": "Erro na Emissão"},
		{"codigo": models.MotivoCancelServNaoRealizado, "descricao": "Serviço não Prestado"},
		{"codigo": models.MotivoCancelDuplicidade, "descricao": "Duplicidade de Nota"},
		{"codigo": models.MotivoCancelErroPreenchimento, "descricao": "Erro de Preenchimento"},
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

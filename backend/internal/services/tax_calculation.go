package services

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/inovar/backend/internal/models"
)

// TaxCalculationService calculates taxes automatically based on regime tributário
type TaxCalculationService struct{}

// TaxCalculationResult holds the result of tax calculations
type TaxCalculationResult struct {
	// Base values
	ValorServicos float64 `json:"valorServicos"`
	ValorDeducoes float64 `json:"valorDeducoes"`
	BaseCalculo   float64 `json:"baseCalculo"`

	// ISS
	AliquotaISS float64 `json:"aliquotaIss"`
	ValorISS    float64 `json:"valorIss"`
	ISSRetido   bool    `json:"issRetido"`

	// Other taxes (non-Simples)
	AliquotaPIS    float64 `json:"aliquotaPis,omitempty"`
	ValorPIS       float64 `json:"valorPis,omitempty"`
	AliquotaCOFINS float64 `json:"aliquotaCofins,omitempty"`
	ValorCOFINS    float64 `json:"valorCofins,omitempty"`
	AliquotaCSLL   float64 `json:"aliquotaCsll,omitempty"`
	ValorCSLL      float64 `json:"valorCsll,omitempty"`
	AliquotaIRPJ   float64 `json:"aliquotaIrpj,omitempty"`
	ValorIRPJ      float64 `json:"valorIrpj,omitempty"`
	AliquotaINSS   float64 `json:"aliquotaInss,omitempty"`
	ValorINSS      float64 `json:"valorInss,omitempty"`

	// Simples Nacional
	AliquotaSimplesNac float64 `json:"aliquotaSimplesNac,omitempty"`
	ValorSimplesNac    float64 `json:"valorSimplesNac,omitempty"`

	// Totals
	TotalTributos float64 `json:"totalTributos"`
	ValorLiquido  float64 `json:"valorLiquido"`

	// Info
	RegimeTributario string `json:"regimeTributario"`
	Observacoes      string `json:"observacoes,omitempty"`
}

// NewTaxCalculationService creates a new tax calculation service
func NewTaxCalculationService() *TaxCalculationService {
	return &TaxCalculationService{}
}

// Calculate calculates all applicable taxes based on fiscal configuration
func (s *TaxCalculationService) Calculate(valorServicos float64, valorDeducoes float64, config *models.ConfiguracaoFiscal) *TaxCalculationResult {
	result := &TaxCalculationResult{
		ValorServicos:    valorServicos,
		ValorDeducoes:    valorDeducoes,
		BaseCalculo:      valorServicos - valorDeducoes,
		RegimeTributario: config.RegimeTributario,
	}

	switch config.RegimeTributario {
	case models.RegimeMEI:
		s.calculateMEI(result, config)
	case models.RegimeSimplesNac:
		s.calculateSimplesNacional(result, config)
	case models.RegimeLucroPresumido:
		s.calculateLucroPresumido(result, config)
	case models.RegimeLucroReal:
		s.calculateLucroReal(result, config)
	case models.RegimeImune, models.RegimeIsento:
		s.calculateImuneIsento(result, config)
	default:
		// Default to Simples if not specified
		s.calculateSimplesNacional(result, config)
	}

	// Calculate final value
	result.ValorLiquido = result.BaseCalculo - result.TotalTributos

	return result
}

// calculateMEI - MEI has fixed monthly tax, ISS included
func (s *TaxCalculationService) calculateMEI(result *TaxCalculationResult, config *models.ConfiguracaoFiscal) {
	// MEI não paga impostos adicionais por nota - já está incluso no DAS mensal
	// ISS é fixo: R$ 5,00/mês para serviços (incluso no DAS)
	result.AliquotaISS = 0
	result.ValorISS = 0
	result.TotalTributos = 0
	result.Observacoes = "MEI: Impostos já inclusos no DAS mensal fixo. " +
		"Não há tributação adicional por nota fiscal. " +
		"Limite anual: R$ 81.000,00"
}

// calculateSimplesNacional - Simples Nacional with progressive rates
func (s *TaxCalculationService) calculateSimplesNacional(result *TaxCalculationResult, config *models.ConfiguracaoFiscal) {
	// Get aliquota based on faixa
	aliquota := s.getAliquotaSimplesNacional(config.FaixaSimplesNac)

	// If custom aliquota is set, use it
	if config.AliquotaSimplesNac > 0 {
		aliquota = config.AliquotaSimplesNac
	}

	result.AliquotaSimplesNac = aliquota
	result.ValorSimplesNac = result.BaseCalculo * (aliquota / 100)

	// ISS is already included in Simples Nacional, but we calculate for reference
	// ISS no Simples = between 2% and 5% depending on faixa
	issAliquota := s.getISSAliquotaSimplesNacional(config.FaixaSimplesNac)
	result.AliquotaISS = issAliquota
	result.ValorISS = result.BaseCalculo * (issAliquota / 100)

	result.TotalTributos = result.ValorSimplesNac
	result.Observacoes = fmt.Sprintf("Simples Nacional - %s - Alíquota: %.2f%% (ISS incluso: %.2f%%)",
		s.getFaixaDescricao(config.FaixaSimplesNac), aliquota, issAliquota)
}

// calculateLucroPresumido - Lucro Presumido with fixed margins
func (s *TaxCalculationService) calculateLucroPresumido(result *TaxCalculationResult, config *models.ConfiguracaoFiscal) {
	baseCalculo := result.BaseCalculo

	// ISS
	if config.AliquotaISSPadrao > 0 {
		result.AliquotaISS = config.AliquotaISSPadrao
	} else {
		result.AliquotaISS = 5.0 // Default ISS for services
	}
	result.ValorISS = baseCalculo * (result.AliquotaISS / 100)
	result.ISSRetido = config.ISSRetido

	// PIS - 0.65% for Lucro Presumido
	if config.AliquotaPIS > 0 {
		result.AliquotaPIS = config.AliquotaPIS
	} else {
		result.AliquotaPIS = 0.65
	}
	result.ValorPIS = baseCalculo * (result.AliquotaPIS / 100)

	// COFINS - 3% for Lucro Presumido
	if config.AliquotaCOFINS > 0 {
		result.AliquotaCOFINS = config.AliquotaCOFINS
	} else {
		result.AliquotaCOFINS = 3.0
	}
	result.ValorCOFINS = baseCalculo * (result.AliquotaCOFINS / 100)

	// IRPJ - Base presumida 32% para serviços, alíquota 15%
	basePresumidaIR := baseCalculo * 0.32
	if config.AliquotaIRPJ > 0 {
		result.AliquotaIRPJ = config.AliquotaIRPJ
	} else {
		result.AliquotaIRPJ = 15.0
	}
	result.ValorIRPJ = basePresumidaIR * (result.AliquotaIRPJ / 100)

	// CSLL - Base presumida 32% para serviços, alíquota 9%
	basePresumidaCSLL := baseCalculo * 0.32
	if config.AliquotaCSLL > 0 {
		result.AliquotaCSLL = config.AliquotaCSLL
	} else {
		result.AliquotaCSLL = 9.0
	}
	result.ValorCSLL = basePresumidaCSLL * (result.AliquotaCSLL / 100)

	// Total
	result.TotalTributos = result.ValorISS + result.ValorPIS + result.ValorCOFINS +
		result.ValorIRPJ + result.ValorCSLL

	result.Observacoes = "Lucro Presumido - Base presumida 32% para serviços. " +
		"IRPJ e CSLL calculados sobre base presumida."
}

// calculateLucroReal - Lucro Real with actual margins
func (s *TaxCalculationService) calculateLucroReal(result *TaxCalculationResult, config *models.ConfiguracaoFiscal) {
	baseCalculo := result.BaseCalculo

	// ISS
	if config.AliquotaISSPadrao > 0 {
		result.AliquotaISS = config.AliquotaISSPadrao
	} else {
		result.AliquotaISS = 5.0
	}
	result.ValorISS = baseCalculo * (result.AliquotaISS / 100)
	result.ISSRetido = config.ISSRetido

	// PIS - 1.65% for Lucro Real (non-cumulativo)
	if config.AliquotaPIS > 0 {
		result.AliquotaPIS = config.AliquotaPIS
	} else {
		result.AliquotaPIS = 1.65
	}
	result.ValorPIS = baseCalculo * (result.AliquotaPIS / 100)

	// COFINS - 7.6% for Lucro Real (non-cumulativo)
	if config.AliquotaCOFINS > 0 {
		result.AliquotaCOFINS = config.AliquotaCOFINS
	} else {
		result.AliquotaCOFINS = 7.6
	}
	result.ValorCOFINS = baseCalculo * (result.AliquotaCOFINS / 100)

	// IRPJ - 15% sobre lucro real (simplified here as % of revenue)
	if config.AliquotaIRPJ > 0 {
		result.AliquotaIRPJ = config.AliquotaIRPJ
	} else {
		result.AliquotaIRPJ = 15.0
	}
	// Simplificado - em produção seria sobre lucro contábil real
	result.ValorIRPJ = baseCalculo * 0.32 * (result.AliquotaIRPJ / 100)

	// CSLL - 9%
	if config.AliquotaCSLL > 0 {
		result.AliquotaCSLL = config.AliquotaCSLL
	} else {
		result.AliquotaCSLL = 9.0
	}
	result.ValorCSLL = baseCalculo * 0.32 * (result.AliquotaCSLL / 100)

	result.TotalTributos = result.ValorISS + result.ValorPIS + result.ValorCOFINS +
		result.ValorIRPJ + result.ValorCSLL

	result.Observacoes = "Lucro Real - PIS/COFINS não-cumulativo. " +
		"IRPJ/CSLL simplificados (em produção, calcular sobre lucro contábil)."
}

// calculateImuneIsento - For immune/exempt entities
func (s *TaxCalculationService) calculateImuneIsento(result *TaxCalculationResult, config *models.ConfiguracaoFiscal) {
	result.AliquotaISS = 0
	result.ValorISS = 0
	result.TotalTributos = 0

	if config.RegimeTributario == models.RegimeImune {
		result.Observacoes = "Entidade Imune - Art. 150, VI, CF/88. Sem tributação."
	} else {
		result.Observacoes = "Isento de impostos conforme legislação específica."
	}
}

// Helper functions for Simples Nacional rates (Anexo III - Serviços)
func (s *TaxCalculationService) getAliquotaSimplesNacional(faixa string) float64 {
	// Alíquotas Anexo III - Serviços (2024)
	switch faixa {
	case models.SimplesNacFaixa1:
		return 6.0 // Até R$ 180.000
	case models.SimplesNacFaixa2:
		return 11.2 // De R$ 180.000,01 até R$ 360.000
	case models.SimplesNacFaixa3:
		return 13.5 // De R$ 360.000,01 até R$ 720.000
	case models.SimplesNacFaixa4:
		return 16.0 // De R$ 720.000,01 até R$ 1.800.000
	case models.SimplesNacFaixa5:
		return 21.0 // De R$ 1.800.000,01 até R$ 3.600.000
	case models.SimplesNacFaixa6:
		return 33.0 // De R$ 3.600.000,01 até R$ 4.800.000
	default:
		return 6.0 // Default to first faixa
	}
}

func (s *TaxCalculationService) getISSAliquotaSimplesNacional(faixa string) float64 {
	// ISS dentro do Simples (Anexo III)
	switch faixa {
	case models.SimplesNacFaixa1:
		return 2.0
	case models.SimplesNacFaixa2:
		return 2.79
	case models.SimplesNacFaixa3:
		return 3.50
	case models.SimplesNacFaixa4:
		return 3.84
	case models.SimplesNacFaixa5:
		return 4.23
	case models.SimplesNacFaixa6:
		return 5.0
	default:
		return 2.0
	}
}

func (s *TaxCalculationService) getFaixaDescricao(faixa string) string {
	switch faixa {
	case models.SimplesNacFaixa1:
		return "Faixa 1 (até R$ 180.000)"
	case models.SimplesNacFaixa2:
		return "Faixa 2 (R$ 180.000 a R$ 360.000)"
	case models.SimplesNacFaixa3:
		return "Faixa 3 (R$ 360.000 a R$ 720.000)"
	case models.SimplesNacFaixa4:
		return "Faixa 4 (R$ 720.000 a R$ 1.800.000)"
	case models.SimplesNacFaixa5:
		return "Faixa 5 (R$ 1.800.000 a R$ 3.600.000)"
	case models.SimplesNacFaixa6:
		return "Faixa 6 (R$ 3.600.000 a R$ 4.800.000)"
	default:
		return "Faixa 1 (padrão)"
	}
}

// CNPJData represents data returned from CNPJ lookup
type CNPJData struct {
	CNPJ             string `json:"cnpj"`
	RazaoSocial      string `json:"razao_social"`
	NomeFantasia     string `json:"nome_fantasia"`
	CNAE             string `json:"cnae_fiscal"`
	CNAEDescricao    string `json:"cnae_fiscal_descricao"`
	Logradouro       string `json:"logradouro"`
	Numero           string `json:"numero"`
	Complemento      string `json:"complemento"`
	Bairro           string `json:"bairro"`
	CEP              string `json:"cep"`
	Municipio        string `json:"municipio"`
	UF               string `json:"uf"`
	RegimeTributario string `json:"regime_tributario"` // Inferred
	Simples          *bool  `json:"opcao_pelo_simples"`
	MEI              *bool  `json:"opcao_pelo_mei"`
}

// LookupCNPJ fetches company data from BrasilAPI
func (s *TaxCalculationService) LookupCNPJ(cnpj string) (*CNPJData, error) {
	// Remove non-digits
	cleanCNPJ := ""
	for _, c := range cnpj {
		if c >= '0' && c <= '9' {
			cleanCNPJ += string(c)
		}
	}

	if len(cleanCNPJ) != 14 {
		return nil, fmt.Errorf("CNPJ inválido")
	}

	// Call BrasilAPI
	resp, err := http.Get("https://brasilapi.com.br/api/cnpj/v1/" + cleanCNPJ)
	if err != nil {
		return nil, fmt.Errorf("erro ao consultar CNPJ: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("CNPJ não encontrado ou erro na API")
	}

	var data CNPJData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %v", err)
	}

	// Infer regime
	if data.MEI != nil && *data.MEI {
		data.RegimeTributario = models.RegimeMEI
	} else if data.Simples != nil && *data.Simples {
		data.RegimeTributario = models.RegimeSimplesNac
	} else {
		// Default to Presumido if not Simples/MEI (common for services)
		// User can change later
		data.RegimeTributario = models.RegimeLucroPresumido
	}

	return &data, nil
}

// DetectRegimeFromCNPJ attempts to detect regime from CNPJ characteristics
func (s *TaxCalculationService) DetectRegimeFromCNPJ(cnpj string) string {
	data, err := s.LookupCNPJ(cnpj)
	if err != nil {
		return models.RegimeSimplesNac // Default
	}
	return data.RegimeTributario
}

// CalculateFaixaSimplesNacional determines the Simples Nacional bracket based on revenue
func (s *TaxCalculationService) CalculateFaixaSimplesNacional(receitaBruta12Meses float64) string {
	switch {
	case receitaBruta12Meses <= 180000:
		return models.SimplesNacFaixa1
	case receitaBruta12Meses <= 360000:
		return models.SimplesNacFaixa2
	case receitaBruta12Meses <= 720000:
		return models.SimplesNacFaixa3
	case receitaBruta12Meses <= 1800000:
		return models.SimplesNacFaixa4
	case receitaBruta12Meses <= 3600000:
		return models.SimplesNacFaixa5
	case receitaBruta12Meses <= 4800000:
		return models.SimplesNacFaixa6
	default:
		// Above limit - must be Lucro Presumido or Real
		return ""
	}
}

// IsMEIEligible checks if CNPJ is eligible for MEI status
func (s *TaxCalculationService) IsMEIEligible(receitaBrutaAnual float64, numFuncionarios int) bool {
	// MEI limits (2024)
	return receitaBrutaAnual <= 81000 && numFuncionarios <= 1
}

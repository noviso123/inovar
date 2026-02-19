package services

import (
	"encoding/json"
	"fmt"

	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
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

// Calculate calculates all applicable taxes based on fiscal configuration via Python Bridge
func (s *TaxCalculationService) Calculate(valorServicos float64, valorDeducoes float64, config *domain.ConfiguracaoFiscal) *TaxCalculationResult {
	// Call Python Bridge
	resp, err := bridge.CallPython("calculate_taxes", map[string]interface{}{
		"valor_servicos": valorServicos,
		"valor_deducoes": valorDeducoes,
		"config":         config,
	})
	if err != nil {
		fmt.Printf("⚠️ Error calculating taxes via bridge: %v. Falling back to simple calculation.\n", err)
		return &TaxCalculationResult{
			ValorServicos: valorServicos,
			BaseCalculo:   valorServicos - valorDeducoes,
			ValorLiquido:  valorServicos - valorDeducoes,
		}
	}

	dataJSON, _ := json.Marshal(resp.Data)
	var result TaxCalculationResult
	if err := json.Unmarshal(dataJSON, &result); err != nil {
		fmt.Printf("⚠️ Error unmarshaling tax result: %v\n", err)
	}

	return &result
}

// Helper functions for Simples Nacional rates (Anexo III - Serviços)
func (s *TaxCalculationService) getAliquotaSimplesNacional(faixa string) float64 {
	// Alíquotas Anexo III - Serviços (2024)
	switch faixa {
	case domain.SimplesNacFaixa1:
		return 6.0 // Até R$ 180.000
	case domain.SimplesNacFaixa2:
		return 11.2 // De R$ 180.000,01 até R$ 360.000
	case domain.SimplesNacFaixa3:
		return 13.5 // De R$ 360.000,01 até R$ 720.000
	case domain.SimplesNacFaixa4:
		return 16.0 // De R$ 720.000,01 até R$ 1.800.000
	case domain.SimplesNacFaixa5:
		return 21.0 // De R$ 1.800.000,01 até R$ 3.600.000
	case domain.SimplesNacFaixa6:
		return 33.0 // De R$ 3.600.000,01 até R$ 4.800.000
	default:
		return 6.0 // Default to first faixa
	}
}

func (s *TaxCalculationService) getISSAliquotaSimplesNacional(faixa string) float64 {
	// ISS dentro do Simples (Anexo III)
	switch faixa {
	case domain.SimplesNacFaixa1:
		return 2.0
	case domain.SimplesNacFaixa2:
		return 2.79
	case domain.SimplesNacFaixa3:
		return 3.50
	case domain.SimplesNacFaixa4:
		return 3.84
	case domain.SimplesNacFaixa5:
		return 4.23
	case domain.SimplesNacFaixa6:
		return 5.0
	default:
		return 2.0
	}
}

func (s *TaxCalculationService) getFaixaDescricao(faixa string) string {
	switch faixa {
	case domain.SimplesNacFaixa1:
		return "Faixa 1 (até R$ 180.000)"
	case domain.SimplesNacFaixa2:
		return "Faixa 2 (R$ 180.000 a R$ 360.000)"
	case domain.SimplesNacFaixa3:
		return "Faixa 3 (R$ 360.000 a R$ 720.000)"
	case domain.SimplesNacFaixa4:
		return "Faixa 4 (R$ 720.000 a R$ 1.800.000)"
	case domain.SimplesNacFaixa5:
		return "Faixa 5 (R$ 1.800.000 a R$ 3.600.000)"
	case domain.SimplesNacFaixa6:
		return "Faixa 6 (R$ 3.600.000 a R$ 4.800.000)"
	default:
		return "Faixa 1 (padrão)"
	}
}

// CNPJData represents data returned from CNPJ lookup
type CNPJData struct {
	CNPJ             string                     `json:"cnpj"`
	RazaoSocial      string                     `json:"razao_social"`
	NomeFantasia     string                     `json:"nome_fantasia"`
	CNAE             int                        `json:"cnae_fiscal"`
	CNAEDescricao    string                     `json:"cnae_fiscal_descricao"`
	Logradouro       string                     `json:"logradouro"`
	Numero           string                     `json:"numero"`
	Complemento      string                     `json:"complemento"`
	Bairro           string                     `json:"bairro"`
	CEP              string                     `json:"cep"`
	Municipio        string                     `json:"municipio"`
	UF               string                     `json:"uf"`
	CodigoMunicipio  int                        `json:"codigo_municipio"`
	RegimeTributario interface{}                `json:"regime_tributario"` // API can return array, so we use interface{} and overwrite later
	Simples          *bool                      `json:"opcao_pelo_simples"`
	MEI              *bool                      `json:"opcao_pelo_mei"`
	SuggestedConfig  *domain.ConfiguracaoFiscal `json:"suggestedConfig,omitempty"`
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

	// Call via Python Bridge
	respBridge, err := bridge.CallPython("lookup_cnpj", map[string]interface{}{
		"cnpj": cleanCNPJ,
	})
	if err != nil {
		return nil, fmt.Errorf("erro ao consultar CNPJ via bridge: %v", err)
	}

	dataJSON, _ := json.Marshal(respBridge.Data)
	var data CNPJData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta do bridge: %v", err)
	}

	// Infer regime
	// Infer regime
	var regime string
	if data.MEI != nil && *data.MEI {
		regime = domain.RegimeMEI
	} else if data.Simples != nil && *data.Simples {
		regime = domain.RegimeSimplesNac
	} else {
		regime = domain.RegimeLucroPresumido
	}
	// We use the inferred regime for our internal logic due to API variability
	data.RegimeTributario = regime

	// Determine TipoCNPJ for SuggestedConfig
	var tipoCNPJ string
	if data.MEI != nil && *data.MEI {
		tipoCNPJ = "MEI"
	} else if data.Simples != nil && *data.Simples {
		tipoCNPJ = "EPP" // Default to EPP for Simples if not specified
	} else {
		tipoCNPJ = "OUTROS"
	}

	// Generate Suggested Config
	config := &domain.ConfiguracaoFiscal{
		RegimeTributario:   regime,
		TipoCNPJ:           tipoCNPJ,
		NaturezaOperacao:   domain.NaturezaTributacao,
		InscricaoMunicipal: "",      // User must fill
		CodigoServico:      "14.01", // Default for AC maintenance
		ItemListaServico:   "14.01",
		Ambiente:           "HOMOLOGACAO", // Standard default
		LocalPrestacao:     "LOCAL",
	}

	// Map IBGE code if available
	if data.CodigoMunicipio != 0 {
		config.CodigoMunicipio = data.CodigoMunicipio
	}
	if data.CNAE != 0 {
		config.CNAE = fmt.Sprintf("%d", data.CNAE)
	}

	// Pre-fill fields based on Regime
	switch regime {
	case domain.RegimeMEI:
		config.AliquotaISSPadrao = 0
		config.AliquotaPIS = 0
		config.AliquotaCOFINS = 0
		config.AliquotaIRPJ = 0
		config.AliquotaCSLL = 0
		config.AliquotaINSS = 0
		config.OptanteSimplesNac = true
		config.IsMEI = true
		config.NaturezaOperacao = domain.NaturezaTributacao
		config.LocalPrestacao = "LOCAL"
	case domain.RegimeSimplesNac:
		config.FaixaSimplesNac = domain.SimplesNacFaixa1
		config.AliquotaSimplesNac = 6.0
		config.OptanteSimplesNac = true
		config.IsMEI = false
		config.AliquotaISSPadrao = 0 // Included in DAS
		config.AliquotaPIS = 0       // Included in DAS
		config.AliquotaCOFINS = 0    // Included in DAS
		config.AliquotaCSLL = 0      // Included in DAS
		config.AliquotaIRPJ = 0      // Included in DAS
		config.RetemPIS = false
		config.RetemCOFINS = false
		config.RetemCSLL = false
		config.RetemIR = false
		config.RetemINSS = false
	case domain.RegimeLucroPresumido:
		config.AliquotaISSPadrao = 5.0
		config.AliquotaPIS = 0.65
		config.AliquotaCOFINS = 3.0
		config.AliquotaIRPJ = 15.0
		config.AliquotaCSLL = 9.0
		config.AliquotaINSS = 11.0
		config.ISSRetido = false
		config.OptanteSimplesNac = false
		config.IsMEI = false
		// Standard withholdings for services
		config.RetemPIS = true
		config.RetemCOFINS = true
		config.RetemCSLL = true
		config.RetemIR = true
		config.RetemINSS = true
	case domain.RegimeLucroReal:
		config.AliquotaISSPadrao = 5.0
		config.AliquotaPIS = 1.65
		config.AliquotaCOFINS = 7.6
		config.AliquotaIRPJ = 15.0
		config.AliquotaCSLL = 9.0
		config.AliquotaINSS = 11.0
		config.OptanteSimplesNac = false
		config.IsMEI = false
		config.RetemPIS = true
		config.RetemCOFINS = true
		config.RetemCSLL = true
		config.RetemIR = true
		config.RetemINSS = true
	}

	data.SuggestedConfig = config

	return &data, nil
}

// DetectRegimeFromCNPJ attempts to detect regime from CNPJ characteristics
func (s *TaxCalculationService) DetectRegimeFromCNPJ(cnpj string) string {
	data, err := s.LookupCNPJ(cnpj)
	if err != nil {
		return domain.RegimeSimplesNac // Default
	}
	if val, ok := data.RegimeTributario.(string); ok {
		return val
	}
	return domain.RegimeSimplesNac
}

// CalculateFaixaSimplesNacional determines the Simples Nacional bracket based on revenue
func (s *TaxCalculationService) CalculateFaixaSimplesNacional(receitaBruta12Meses float64) string {
	switch {
	case receitaBruta12Meses <= 180000:
		return domain.SimplesNacFaixa1
	case receitaBruta12Meses <= 360000:
		return domain.SimplesNacFaixa2
	case receitaBruta12Meses <= 720000:
		return domain.SimplesNacFaixa3
	case receitaBruta12Meses <= 1800000:
		return domain.SimplesNacFaixa4
	case receitaBruta12Meses <= 3600000:
		return domain.SimplesNacFaixa5
	case receitaBruta12Meses <= 4800000:
		return domain.SimplesNacFaixa6
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

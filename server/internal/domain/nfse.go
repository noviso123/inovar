package domain

import (
	"time"
)

// NotaFiscal represents an NFS-e (Nota Fiscal de Serviço Eletrônica)
type NotaFiscal struct {
	ID            string `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID string `gorm:"size:36;index;not null" json:"solicitacaoId"`
	PrestadorID   string `gorm:"size:36;index;not null" json:"prestadorId"`

	// NFS-e Identification
	Numero            string `gorm:"size:50" json:"numero,omitempty"`
	CodigoVerificacao string `gorm:"size:50" json:"codigoVerificacao,omitempty"`

	// Client/Tomador Info
	TomadorNome      string `gorm:"size:255;not null" json:"tomadorNome"`
	TomadorDocumento string `gorm:"size:20;not null" json:"tomadorDocumento"`
	TomadorEndereco  string `gorm:"type:text" json:"tomadorEndereco,omitempty"`

	// Service Description
	Discriminacao string `gorm:"type:text;not null" json:"discriminacao"`
	CodigoServico string `gorm:"size:20" json:"codigoServico"`
	CNAE          string `gorm:"size:20" json:"cnae,omitempty"`

	// Values
	ValorServicos float64 `json:"valorServicos"`
	ValorDeducoes float64 `json:"valorDeducoes"`
	ValorLiquido  float64 `json:"valorLiquido"`

	// Taxes
	AliquotaISS float64 `json:"aliquotaIss"`
	ValorISS    float64 `json:"valorIss"`
	ValorPIS    float64 `json:"valorPis,omitempty"`
	ValorCOFINS float64 `json:"valorCofins,omitempty"`
	ValorCSLL   float64 `json:"valorCsll,omitempty"`
	ValorIR     float64 `json:"valorIr,omitempty"`
	ValorINSS   float64 `json:"valorInss,omitempty"`

	// Status
	Status       string `gorm:"size:30;not null;index" json:"status"` // PENDENTE, PROCESSANDO, EMITIDA, CANCELADA, ERRO
	MensagemErro string `gorm:"type:text" json:"mensagemErro,omitempty"`

	// Files
	XMLPath string `gorm:"size:500" json:"xmlPath,omitempty"`
	PDFPath string `gorm:"size:500" json:"pdfPath,omitempty"`

	// Dates
	DataEmissao     *time.Time `json:"dataEmissao,omitempty"`
	DataCompetencia time.Time  `json:"dataCompetencia"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func (NotaFiscal) TableName() string { return "notas_fiscais" }

// NFS-e Status constants
const (
	NFSeStatusPendente    = "PENDENTE"
	NFSeStatusProcessando = "PROCESSANDO"
	NFSeStatusEmitida     = "EMITIDA"
	NFSeStatusCancelada   = "CANCELADA"
	NFSeStatusErro        = "ERRO"
)

// CertificadoDigital represents a provider's digital certificate for NFS-e
type CertificadoDigital struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	PrestadorID string    `gorm:"size:36;uniqueIndex;not null" json:"prestadorId"`
	Nome        string    `gorm:"size:255;not null" json:"nome"`
	Tipo        string    `gorm:"size:20;not null" json:"tipo"` // A1, A3
	Validade    time.Time `json:"validade"`
	CertPath    string    `gorm:"size:500" json:"certPath,omitempty"` // Encrypted path
	Ativo       bool      `json:"ativo"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (CertificadoDigital) TableName() string { return "certificados_digitais" }

// ConfiguracaoFiscal holds fiscal configuration for a provider
type ConfiguracaoFiscal struct {
	ID          string `gorm:"primaryKey;size:36" json:"id"`
	PrestadorID string `gorm:"size:36;uniqueIndex;not null" json:"prestadorId"`

	// Company fiscal info
	InscricaoMunicipal string `gorm:"size:30" json:"inscricaoMunicipal,omitempty"`
	InscricaoEstadual  string `gorm:"size:30" json:"inscricaoEstadual,omitempty"`
	CNAE               string `gorm:"size:20" json:"cnae,omitempty"`
	CodigoServico      string `gorm:"size:20" json:"codigoServico"` // Default service code
	ItemListaServico   string `gorm:"size:10" json:"itemListaServico"`

	// Tax regime - automatically detected or manually set
	RegimeTributario string `gorm:"size:50" json:"regimeTributario"` // See RegimeTributario constants
	TipoCNPJ         string `gorm:"size:30" json:"tipoCNPJ"`         // MEI, SIMPLES, LUCRO_PRESUMIDO, LUCRO_REAL

	// Simples Nacional
	OptanteSimplesNac  bool    `json:"optanteSimplesNac"`
	FaixaSimplesNac    string  `gorm:"size:20" json:"faixaSimplesNac,omitempty"` // FAIXA_1, FAIXA_2, etc
	AliquotaSimplesNac float64 `json:"aliquotaSimplesNac,omitempty"`             // % total Simples

	// MEI
	IsMEI bool `json:"isMei"`

	// Cultural incentive
	IncentivadorCultural bool `json:"incentivadorCultural"`

	// ISS config
	AliquotaISSPadrao float64 `json:"aliquotaISSPadrao"`               // % ISS
	ISSRetido         bool    `json:"issRetido"`                       // ISS retido pelo tomador
	LocalPrestacao    string  `gorm:"size:20" json:"localPrestacao"`   // LOCAL, FORA_MUNICIPIO
	NaturezaOperacao  string  `gorm:"size:50" json:"naturezaOperacao"` // See NaturezaOperacao constants

	// Other taxes (for non-Simples)
	AliquotaPIS    float64 `json:"aliquotaPIS,omitempty"`    // 0.65% or 1.65%
	AliquotaCOFINS float64 `json:"aliquotaCOFINS,omitempty"` // 3% or 7.6%
	AliquotaCSLL   float64 `json:"aliquotaCSLL,omitempty"`   // 9%
	AliquotaIRPJ   float64 `json:"aliquotaIRPJ,omitempty"`   // 15%
	AliquotaINSS   float64 `json:"aliquotaINSS,omitempty"`   // 11%

	// Retenções
	RetemPIS    bool `json:"retemPis"`
	RetemCOFINS bool `json:"retemCofins"`
	RetemCSLL   bool `json:"retemCsll"`
	RetemIR     bool `json:"retemIr"`
	RetemINSS   bool `json:"retemInss"`

	// Environment
	Ambiente string `gorm:"size:20" json:"ambiente"` // PRODUCAO, HOMOLOGACAO

	// Código municipal (IBGE)
	CodigoMunicipio int `json:"codigoMunicipio,omitempty"` // Código IBGE

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (ConfiguracaoFiscal) TableName() string { return "configuracoes_fiscais" }

// Regime Tributário constants
const (
	RegimeMEI            = "MEI"
	RegimeSimplesNac     = "SIMPLES_NACIONAL"
	RegimeLucroPresumido = "LUCRO_PRESUMIDO"
	RegimeLucroReal      = "LUCRO_REAL"
	RegimeImune          = "IMUNE"
	RegimeIsento         = "ISENTO"
)

// Natureza da Operação
const (
	NaturezaTributacao              = "TRIBUTACAO_MUNICIPIO"
	NaturezaTributacaoForaMunicipio = "TRIBUTACAO_FORA_MUNICIPIO"
	NaturezaIsencao                 = "ISENCAO"
	NaturezaImunidade               = "IMUNIDADE"
	NaturezaSuspensao               = "SUSPENSAO"
	NaturezaExigibilidadeSuspensa   = "EXIGIBILIDADE_SUSPENSA"
)

// Faixas Simples Nacional (2024)
const (
	SimplesNacFaixa1 = "FAIXA_1" // Até R$ 180.000,00
	SimplesNacFaixa2 = "FAIXA_2" // De R$ 180.000,01 até R$ 360.000,00
	SimplesNacFaixa3 = "FAIXA_3" // De R$ 360.000,01 até R$ 720.000,00
	SimplesNacFaixa4 = "FAIXA_4" // De R$ 720.000,01 até R$ 1.800.000,00
	SimplesNacFaixa5 = "FAIXA_5" // De R$ 1.800.000,01 até R$ 3.600.000,00
	SimplesNacFaixa6 = "FAIXA_6" // De R$ 3.600.000,01 até R$ 4.800.000,00
)

// NFSeEvento represents events/history for an NFS-e
type NFSeEvento struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	NFSeID    string    `gorm:"size:36;index;not null" json:"nfseId"`
	Tipo      string    `gorm:"size:50;not null" json:"tipo"` // EMISSAO, AUTORIZACAO, CANCELAMENTO, REJEICAO
	Status    string    `gorm:"size:30" json:"status"`
	Protocolo string    `gorm:"size:100" json:"protocolo,omitempty"`
	Mensagem  string    `gorm:"type:text" json:"mensagem,omitempty"`
	Motivo    string    `gorm:"type:text" json:"motivo,omitempty"` // Motivo cancelamento
	UserID    string    `gorm:"size:36" json:"userId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

func (NFSeEvento) TableName() string { return "nfse_eventos" }

// NFSeEvento Types
const (
	NFSeEventoEmissao      = "EMISSAO"
	NFSeEventoAutorizacao  = "AUTORIZACAO"
	NFSeEventoRejeicao     = "REJEICAO"
	NFSeEventoCancelamento = "CANCELAMENTO"
	NFSeEventoConsulta     = "CONSULTA"
	NFSeEventoSubstituicao = "SUBSTITUICAO"
)

// Motivos de Cancelamento (padrão GOV.BR)
const (
	MotivoCancelErroEmissao       = "1" // Erro na emissão
	MotivoCancelServNaoRealizado  = "2" // Serviço não prestado
	MotivoCancelDuplicidade       = "3" // Duplicidade
	MotivoCancelErroPreenchimento = "4" // Erro de preenchimento
)

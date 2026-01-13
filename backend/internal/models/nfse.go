package models

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

	// Values
	ValorServicos float64 `json:"valorServicos"`
	ValorDeducoes float64 `json:"valorDeducoes"`
	ValorLiquido  float64 `json:"valorLiquido"`

	// Taxes
	AliquotaISS float64 `json:"aliquotaIss"`
	ValorISS    float64 `json:"valorIss"`

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
	CNAE               string `gorm:"size:20" json:"cnae,omitempty"`
	CodigoServico      string `gorm:"size:20" json:"codigoServico"` // Default service code
	ItemListaServico   string `gorm:"size:10" json:"itemListaServico"`

	// Tax regime
	RegimeTributario     string `gorm:"size:30" json:"regimeTributario"` // SIMPLES, LUCRO_PRESUMIDO, etc.
	OptanteSimplesNac    bool   `json:"optanteSimplesNac"`
	IncentivadorCultural bool   `json:"incentivadorCultural"`

	// ISS config
	AliquotaISSPadrao float64 `json:"aliquotaIssPadrao"`
	ISSRetido         bool    `json:"issRetido"`

	// Environment
	Ambiente string `gorm:"size:20" json:"ambiente"` // PRODUCAO, HOMOLOGACAO

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (ConfiguracaoFiscal) TableName() string { return "configuracoes_fiscais" }

package domain

import (
	"time"

	"gorm.io/gorm"
)

// Status constants
const (
	StatusAberta      = "ABERTA"
	StatusAtribuida   = "ATRIBUIDA"
	StatusAgendada    = "AGENDADA"
	StatusEmAndamento = "EM_ANDAMENTO"
	StatusPausada     = "PAUSADA"
	StatusFinalizada  = "FINALIZADA"
	StatusConcluida   = "CONCLUIDA"
	StatusCancelada   = "CANCELADA"
)

// Priority constants
const (
	PriorityBaixa       = "BAIXA"
	PriorityMedia       = "MEDIA"
	PriorityAlta        = "ALTA"
	PriorityEmergencial = "EMERGENCIAL"
)

// Solicitacao represents a service request
type Solicitacao struct {
	ID              string     `gorm:"primaryKey;size:36" json:"id"`
	Numero          int        `gorm:"uniqueIndex:idx_num_comp;not null" json:"numero"` // Sequential number UNIQUE per company
	ClientID        string     `gorm:"size:36;not null;index" json:"clientId"`
	ClientName      string     `gorm:"size:255;not null" json:"clientName"`
	CompanyID       string     `gorm:"size:36;not null;uniqueIndex:idx_num_comp" json:"companyId"`
	Status          string     `gorm:"size:20;not null;index" json:"status"`
	Priority        string     `gorm:"size:20;not null;index" json:"priority"`
	ServiceType     string     `gorm:"size:100" json:"serviceType,omitempty"`
	Description     string     `gorm:"type:text;not null" json:"description"`
	ResponsibleID   *string    `gorm:"size:36;index" json:"responsibleId,omitempty"`
	ResponsibleName string     `gorm:"size:255" json:"responsibleName,omitempty"`
	ScheduledAt     *time.Time `json:"scheduledAt,omitempty"`
	SLALimit        time.Time  `gorm:"not null" json:"slaLimit"`
	ConfirmedAt     *time.Time `json:"confirmedAt,omitempty"`
	ConfirmedBy     *string    `gorm:"size:36" json:"confirmedBy,omitempty"`
	Observation     string     `gorm:"type:text" json:"observation,omitempty"`
	LockedBy        *string    `gorm:"size:36" json:"lockedBy,omitempty"`
	LockedAt        *time.Time `json:"lockedAt,omitempty"`

	// Workflow fields
	ValorOrcamento    float64    `json:"valorOrcamento,omitempty"`
	OrcamentoAprovado bool       `json:"orcamentoAprovado,omitempty"`
	AssinaturaCliente string     `gorm:"type:text" json:"assinaturaCliente,omitempty"`
	AssinaturaTecnico string     `gorm:"type:text" json:"assinaturaTecnico,omitempty"`
	DataAssinatura    *time.Time `json:"dataAssinatura,omitempty"`
	MaterialsUsed     string     `gorm:"type:text" json:"materialsUsed,omitempty"`
	NextMaintenanceAt *time.Time `json:"nextMaintenanceAt,omitempty"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Client         Cliente                  `gorm:"foreignKey:ClientID" json:"client,omitempty"`
	Equipments     []SolicitacaoEquipamento `gorm:"foreignKey:SolicitacaoID" json:"equipments,omitempty"`
	History        []SolicitacaoHistorico   `gorm:"foreignKey:SolicitacaoID" json:"history,omitempty"`
	Checklists     []Checklist              `gorm:"foreignKey:SolicitacaoID" json:"checklists,omitempty"`
	Attachments    []Anexo                  `gorm:"foreignKey:SolicitacaoID" json:"attachments,omitempty"`
	OrcamentoItens []OrcamentoItem          `gorm:"foreignKey:SolicitacaoID" json:"orcamentoItens,omitempty"`
	NotaFiscal     *NotaFiscal              `gorm:"foreignKey:SolicitacaoID" json:"notaFiscal,omitempty"`
}

func (Solicitacao) TableName() string { return "solicitacoes" }

package domain

// SolicitacaoEquipamento is the N:N junction table
type SolicitacaoEquipamento struct {
	ID            string `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID string `gorm:"size:36;not null;index" json:"solicitacaoId"`
	EquipamentoID string `gorm:"size:36;not null;index" json:"equipamentoId"`

	Equipamento Equipamento `gorm:"foreignKey:EquipamentoID" json:"equipamento,omitempty"`
}

func (SolicitacaoEquipamento) TableName() string { return "solicitacao_equipamentos" }

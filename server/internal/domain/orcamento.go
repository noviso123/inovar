package domain

import (
	"time"
)

// OrcamentoItem represents a line item in a budget/quote
type OrcamentoItem struct {
	ID            string  `gorm:"primaryKey;size:36" json:"id"`
	SolicitacaoID string  `gorm:"size:36;index;not null" json:"solicitacaoId"`
	Descricao     string  `gorm:"size:255;not null" json:"descricao"`
	Quantidade    float64 `json:"quantidade"`
	ValorUnit     float64 `json:"valorUnit"`
	ValorTotal    float64 `json:"valorTotal"`
	Tipo          string  `gorm:"size:50" json:"tipo"` // SERVICO, MATERIAL, MAO_DE_OBRA
	CreatedAt     time.Time `json:"createdAt"`
}

func (OrcamentoItem) TableName() string { return "orcamento_itens" }

// Sugestões inteligentes para orçamentos de ar-condicionado
var SugestoesOrcamento = []map[string]interface{}{
	// Serviços de Manutenção Preventiva
	{"descricao": "Limpeza completa do ar-condicionado (evaporadora + condensadora)", "tipo": "SERVICO", "valorSugerido": 150.00},
	{"descricao": "Higienização com produtos antibacterianos", "tipo": "SERVICO", "valorSugerido": 80.00},
	{"descricao": "Limpeza de filtros e serpentina", "tipo": "SERVICO", "valorSugerido": 100.00},
	{"descricao": "Verificação e reaperto de conexões elétricas", "tipo": "SERVICO", "valorSugerido": 50.00},
	{"descricao": "Medição de temperatura e pressão do gás", "tipo": "SERVICO", "valorSugerido": 60.00},

	// Serviços de Manutenção Corretiva
	{"descricao": "Recarga de gás refrigerante R410A (por kg)", "tipo": "SERVICO", "valorSugerido": 200.00},
	{"descricao": "Recarga de gás refrigerante R22 (por kg)", "tipo": "SERVICO", "valorSugerido": 180.00},
	{"descricao": "Correção de vazamento de gás", "tipo": "SERVICO", "valorSugerido": 250.00},
	{"descricao": "Troca de capacitor", "tipo": "SERVICO", "valorSugerido": 120.00},
	{"descricao": "Troca de motor do ventilador", "tipo": "SERVICO", "valorSugerido": 350.00},
	{"descricao": "Troca de compressor", "tipo": "SERVICO", "valorSugerido": 800.00},
	{"descricao": "Troca de placa eletrônica", "tipo": "SERVICO", "valorSugerido": 450.00},
	{"descricao": "Desobstrução de dreno", "tipo": "SERVICO", "valorSugerido": 80.00},

	// Instalação
	{"descricao": "Instalação completa de split (até 12000 BTUs)", "tipo": "SERVICO", "valorSugerido": 400.00},
	{"descricao": "Instalação completa de split (18000-24000 BTUs)", "tipo": "SERVICO", "valorSugerido": 500.00},
	{"descricao": "Instalação completa de split (acima de 24000 BTUs)", "tipo": "SERVICO", "valorSugerido": 650.00},
	{"descricao": "Desinstalação de ar-condicionado", "tipo": "SERVICO", "valorSugerido": 200.00},
	{"descricao": "Reinstalação de ar-condicionado", "tipo": "SERVICO", "valorSugerido": 300.00},
	{"descricao": "Instalação de ponto elétrico dedicado", "tipo": "SERVICO", "valorSugerido": 250.00},

	// Materiais
	{"descricao": "Tubulação de cobre (metro)", "tipo": "MATERIAL", "valorSugerido": 45.00},
	{"descricao": "Suporte para condensadora", "tipo": "MATERIAL", "valorSugerido": 120.00},
	{"descricao": "Filtro de ar novo", "tipo": "MATERIAL", "valorSugerido": 60.00},
	{"descricao": "Capacitor de partida", "tipo": "MATERIAL", "valorSugerido": 80.00},
	{"descricao": "Isolamento térmico (metro)", "tipo": "MATERIAL", "valorSugerido": 25.00},
	{"descricao": "Canaleta plástica (metro)", "tipo": "MATERIAL", "valorSugerido": 15.00},
	{"descricao": "Disjuntor dedicado", "tipo": "MATERIAL", "valorSugerido": 45.00},

	// Mão de obra adicional
	{"descricao": "Hora técnica adicional", "tipo": "MAO_DE_OBRA", "valorSugerido": 80.00},
	{"descricao": "Deslocamento extra (por km)", "tipo": "MAO_DE_OBRA", "valorSugerido": 3.00},
	{"descricao": "Atendimento emergencial (adicional)", "tipo": "MAO_DE_OBRA", "valorSugerido": 100.00},
	{"descricao": "Trabalho em altura (adicional)", "tipo": "MAO_DE_OBRA", "valorSugerido": 150.00},
}

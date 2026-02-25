package handlers

import (
	"inovar/internal/domain"

	"github.com/gofiber/fiber/v2"
)

// GetFinanceSummary calculates financial stats from requests
func (h *Handler) GetFinanceSummary(c *fiber.Ctx) error {
	var total float64
	var count int64

	// Example: sum of all budget items in completed requests
	h.DB.Model(&domain.OrcamentoItem{}).
		Joins("Join solicitacoes on solicitacoes.id = orcamento_items.solicitacao_id").
		Where("solicitacoes.status = ?", domain.StatusConcluida).
		Select("sum(valor_unit * quantidade)").Row().Scan(&total)

	h.DB.Model(&domain.Solicitacao{}).Where("status = ?", domain.StatusConcluida).Count(&count)

	return Success(c, fiber.Map{
		"totalRevenue":    total,
		"totalOrders":     count,
		"pendingPayments": 0, // Placeholder
	})
}

// ListTransactions returns a list of financial transactions
func (h *Handler) ListTransactions(c *fiber.Ctx) error {
	return h.GetFinanceSummary(c)
}

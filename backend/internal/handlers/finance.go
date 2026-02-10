package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/inovar/backend/internal/models"
)

// GetFinanceSummary calculates financial stats from requests
func (h *Handler) GetFinanceSummary(c *fiber.Ctx) error {
	var requests []models.Solicitacao
	// Preload OrcamentoItens to have real transaction data
	if err := h.DB.Preload("OrcamentoItens").Find(&requests).Error; err != nil {
		return ServerError(c, err)
	}

	totalRevenue := 0.0
	pendingRevenue := 0.0
	expenses := 0.0

	var expenseRecords []models.Expense
	h.DB.Find(&expenseRecords)
	for _, exp := range expenseRecords {
		expenses += exp.Amount
	}

	transactions := []fiber.Map{}

	for _, req := range requests {
		if req.Status == models.StatusFinalizada {
			totalRevenue += req.ValorOrcamento

			// Transaction for the total OS value
			transactions = append(transactions, fiber.Map{
				"id":          req.ID,
				"date":        req.UpdatedAt, // Use update date as completion date
				"type":        "income",
				"amount":      req.ValorOrcamento,
				"description": fmt.Sprintf("OS #%d - %s", req.Numero, req.ClientName),
				"status":      "paid",
			})
		} else if req.Status != models.StatusCancelada {
			pendingRevenue += req.ValorOrcamento
		}
	}

	// Add individual expense transactions
	for _, exp := range expenseRecords {
		transactions = append(transactions, fiber.Map{
			"id":          exp.ID,
			"date":        exp.Date,
			"type":        "expense",
			"amount":      exp.Amount,
			"description": fmt.Sprintf("[%s] %s", exp.Category, exp.Description),
			"status":      "paid",
		})
	}

	return Success(c, fiber.Map{
		"totalRevenue":   totalRevenue,
		"netProfit":      totalRevenue - expenses,
		"pendingRevenue": pendingRevenue,
		"expenses":       expenses,
		"transactions":   transactions,
	})
}

// ListTransactions returns a list of financial transactions
func (h *Handler) ListTransactions(c *fiber.Ctx) error {
	// Reusing logic from Summary for now, or could be a separate table
	return h.GetFinanceSummary(c)
}

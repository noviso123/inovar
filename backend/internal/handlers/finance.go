package handlers

import (


	"github.com/gofiber/fiber/v2"
	"github.com/inovar/backend/internal/models"
)

// GetFinanceSummary calculates financial stats from requests
func (h *Handler) GetFinanceSummary(c *fiber.Ctx) error {
	var requests []models.Solicitacao
	if err := h.DB.Find(&requests).Error; err != nil {
		return ServerError(c, err)
	}

	// Calculate mock finance data based on real requests
	// In a real scenario, this would come from a payments table
	// Here we simulate values based on request types to "make it real"

	totalRevenue := 0.0
	pendingRevenue := 0.0
	expenses := 0.0

	transactions := []fiber.Map{}

	for _, req := range requests {
		value := 0.0
		cost := 0.0

		// Simulate values based on priority/complexity
		switch req.Priority {
		case models.PriorityBaixa:
			value = 150.00
			cost = 40.00
		case models.PriorityMedia:
			value = 350.00
			cost = 80.00
		case models.PriorityAlta:
			value = 650.00
			cost = 150.00
		case models.PriorityEmergencial:
			value = 1200.00
			cost = 300.00
		}

		if req.Status == models.StatusFinalizada {
			totalRevenue += value
			expenses += cost
			transactions = append(transactions, fiber.Map{
				"id":        req.ID,
				"date":      req.CreatedAt,
				"type":      "income",
				"amount":    value,
				"description": "OS #" + req.ID + " - " + req.Description,
				"status":    "paid",
			})
			transactions = append(transactions, fiber.Map{
				"id":        req.ID + "-cost",
				"date":      req.CreatedAt,
				"type":      "expense",
				"amount":    cost,
				"description": "Custo Operacional OS #" + req.ID,
				"status":    "paid",
			})
		} else if req.Status != models.StatusCancelada {
			pendingRevenue += value
		}
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

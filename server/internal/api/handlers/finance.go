package handlers

import (
	"inovar/internal/infra/bridge"

	"github.com/gofiber/fiber/v2"
)

// GetFinanceSummary calculates financial stats from requests
func (h *Handler) GetFinanceSummary(c *fiber.Ctx) error {
	res, err := bridge.CallPyService("GET", "/db/finance/summary", nil)
	if err != nil {
		return ServerError(c, err)
	}

	return Success(c, res["data"])
}

// ListTransactions returns a list of financial transactions
func (h *Handler) ListTransactions(c *fiber.Ctx) error {
	return h.GetFinanceSummary(c)
}

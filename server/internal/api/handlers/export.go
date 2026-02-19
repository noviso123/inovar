package handlers

import (
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"inovar/internal/domain"
)

// ExportFinance exports financial transactions to CSV
func (h *Handler) ExportFinance(c *fiber.Ctx) error {
	var requests []domain.Solicitacao
	if err := h.DB.Preload("OrcamentoItens").Find(&requests).Error; err != nil {
		return ServerError(c, err)
	}

	var expenses []domain.Expense
	h.DB.Find(&expenses)

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=finance_export_%s.csv", time.Now().Format("20060102_1504")))

	writer := csv.NewWriter(c)
	defer writer.Flush()

	// Header
	writer.Write([]string{"ID", "Data", "Tipo", "Valor", "Descricao", "Status"})

	// Income from completed requests
	for _, req := range requests {
		if req.Status == domain.StatusFinalizada {
			writer.Write([]string{
				req.ID,
				req.UpdatedAt.Format("02/01/2006 15:04"),
				"RECEITA",
				fmt.Sprintf("%.2f", req.ValorOrcamento),
				fmt.Sprintf("Chamado #%d - %s", req.Numero, req.ClientName),
				"PAGO",
			})
		}
	}

	// Expenses
	for _, exp := range expenses {
		writer.Write([]string{
			exp.ID,
			exp.Date.Format("02/01/2006 15:04"),
			"DESPESA",
			fmt.Sprintf("%.2f", exp.Amount),
			fmt.Sprintf("[%s] %s", exp.Category, exp.Description),
			"PAGO",
		})
	}

	return nil
}

// ExportAudit exports audit logs to CSV
func (h *Handler) ExportAudit(c *fiber.Ctx) error {
	var logs []domain.AuditLog
	if err := h.DB.Order("created_at desc").Find(&logs).Error; err != nil {
		return ServerError(c, err)
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=audit_export_%s.csv", time.Now().Format("20060102_1504")))

	writer := csv.NewWriter(c)
	defer writer.Flush()

	// Header
	writer.Write([]string{"Timestamp", "Usuario", "Role", "Entidade", "Acao", "Detalhes", "IP", "Antes", "Depois"})

	for _, l := range logs {
		writer.Write([]string{
			l.CreatedAt.Format("02/01/2006 15:04:05"),
			l.UserName,
			l.UserRole,
			l.Entity,
			l.Action,
			l.Details,
			l.IPAddress,
			l.BeforeValue,
			l.AfterValue,
		})
	}

	return nil
}

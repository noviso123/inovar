package handlers

import (
	"sort"

	"github.com/gofiber/fiber/v2"
)

// ListRoutes returns all registered routes
func (h *Handler) ListRoutes(c *fiber.Ctx) error {
	var routes []fiber.Map

	for _, stack := range c.App().Stack() {
		for _, route := range stack {
			routes = append(routes, fiber.Map{
				"method": route.Method,
				"path":   route.Path,
				"name":   route.Name,
			})
		}
	}

	sort.Slice(routes, func(i, j int) bool {
		return routes[i]["path"].(string) < routes[j]["path"].(string)
	})

	return Success(c, routes)
}

// ListTables returns all database tables
func (h *Handler) ListTables(c *fiber.Ctx) error {
	var tables []string

	// GORM Migrator is database-agnostic (works with SQLite)
	tableList, err := h.DB.Migrator().GetTables()
	if err != nil {
		return ServerError(c, err)
	}
	tables = tableList

	return Success(c, tables)
}

// GetTableData returns data from a specific table
func (h *Handler) GetTableData(c *fiber.Ctx) error {
	tableName := c.Params("name")

	// Security check: Ensure table exists to prevent SQL injection via table name
	if !h.DB.Migrator().HasTable(tableName) {
		return NotFound(c, "Tabela não encontrada")
	}

	// Fetch data (limit 100)
	var results []map[string]interface{}
	if err := h.DB.Table(tableName).Limit(100).Order("created_at desc").Find(&results).Error; err != nil {
		// Try without order if created_at doesn't exist
		if err := h.DB.Table(tableName).Limit(100).Find(&results).Error; err != nil {
			return ServerError(c, err)
		}
	}

	return Success(c, results)
}

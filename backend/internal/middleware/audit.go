package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/inovar/backend/internal/models"
)

// AuditMiddleware logs all actions
func AuditMiddleware(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip for GET requests and health checks
		if c.Method() == "GET" || c.Path() == "/health" {
			return c.Next()
		}

		// Process request first
		err := c.Next()

		// Log after processing
		userID := GetUserID(c)
		userName := GetUserName(c)
		userRole := GetUserRole(c)

		if userID != "" {
			log := models.AuditLog{
				ID:        uuid.New().String(),
				UserID:    userID,
				UserName:  userName,
				UserRole:  userRole,
				Entity:    extractEntity(c.Path()),
				EntityID:  c.Params("id"),
				Action:    c.Method() + " " + c.Path(),
				Details:   string(c.Body()),
				IPAddress: c.IP(),
				UserAgent: c.Get("User-Agent"),
				CreatedAt: time.Now(),
			}

			// Async save to not block response
			go func() {
				db.Create(&log)
			}()
		}

		return err
	}
}

func extractEntity(path string) string {
	// Extract entity name from path like /api/users -> users
	parts := []string{"users", "clients", "equipments", "requests", "checklists", "attachments", "agenda", "settings"}
	for _, part := range parts {
		if strings.Contains(path, part) {
			return part
		}
	}
	return "unknown"
}

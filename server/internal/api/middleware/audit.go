package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"inovar/internal/domain"
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
		userRole := GetUserRole(c)

		if userID != "" {
			// Get user name
			var user domain.User
			db.First(&user, "id = ?", userID)

			log := domain.AuditLog{
				ID:        uuid.New().String(),
				UserID:    userID,
				UserName:  user.Name,
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
		if contains(path, part) {
			return part
		}
	}
	return "unknown"
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

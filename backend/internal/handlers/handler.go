package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
	"github.com/inovar/backend/internal/services"
	"github.com/inovar/backend/internal/websocket"
)

// Handler contains all HTTP handlers
type Handler struct {
	DB             *gorm.DB
	Config         *config.Config
	Hub            *websocket.Hub
	EmailService   *services.EmailService
	StorageService *services.StorageService
}

// New creates a new Handler instance
func New(db *gorm.DB, cfg *config.Config) *Handler {
	hub := websocket.NewHub()
	go hub.Run()

	emailService := services.NewEmailService(cfg)
	storageService := services.NewStorageService(cfg)

	return &Handler{
		DB:             db,
		Config:         cfg,
		Hub:            hub,
		EmailService:   emailService,
		StorageService: storageService,
	}
}

// ErrorHandler is the custom error handler
func ErrorHandler(c *fiber.Ctx, err error) error {
	// FULL LIBERATION: Always return 200 OK
	code := fiber.StatusOK
	message := "Erro capturado e liberado"

	if e, ok := err.(*fiber.Error); ok {
		message = e.Message
	} else if err != nil {
		message = err.Error()
	}

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   true,
		"code":    code, // Still send 200 as requested
		"message": message,
	})
}

// Response helpers
func Success(c *fiber.Ctx, data interface{}) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

func BadRequest(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": false,
		"error":   "bad_request",
		"message": message,
	})
}

func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": false,
		"error":   "not_found",
		"message": message,
	})
}

func Forbidden(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": false,
		"error":   "forbidden",
		"message": message,
	})
}

func ServerError(c *fiber.Ctx, err error) error {
	details := ""
	if err != nil {
		details = err.Error()
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": false,
		"error":   "server_error",
		"message": "Erro interno (liberado)",
		"details": details,
	})
}

// LogAudit records a system action with deep diffs
func (h *Handler) LogAudit(c *fiber.Ctx, entity, entityID, action, details string, before, after interface{}) {
	userID := middleware.GetUserID(c)
	userName := middleware.GetUserName(c)
	userRole := middleware.GetUserRole(c)

	var beforeJSON, afterJSON string
	if before != nil {
		b, _ := json.Marshal(before)
		beforeJSON = string(b)
	}
	if after != nil {
		a, _ := json.Marshal(after)
		afterJSON = string(a)
	}

	log := models.AuditLog{
		ID:          "", // Handled by DB or GORM if configured, otherwise uuid
		UserID:      userID,
		UserName:    userName,
		UserRole:    userRole,
		Entity:      entity,
		EntityID:    entityID,
		Action:      action,
		Details:     details,
		BeforeValue: beforeJSON,
		AfterValue:  afterJSON,
		IPAddress:   c.IP(),
		UserAgent:   string(c.Context().UserAgent()),
	}

	// Generate UUID if needed
	if log.ID == "" {
		log.ID = "" // We'll let GORM handle it if it has a hook, or use uuid.NewString()
	}

	h.DB.Create(&log)
}

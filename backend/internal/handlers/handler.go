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
	// SupabaseService *services.SupabaseService
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
		// SupabaseService: supabaseService,
	}
}

// ErrorHandler is the custom error handler
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Erro interno do servidor"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"code":    code,
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
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error":   "bad_request",
		"message": message,
	})
}

func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"error":   "not_found",
		"message": message,
	})
}

func Forbidden(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"error":   "forbidden",
		"message": message,
	})
}

func ServerError(c *fiber.Ctx, err error) error {
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"error":   "server_error",
		"message": "Erro interno do servidor",
		"details": err.Error(),
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

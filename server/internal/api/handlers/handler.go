package handlers

import (
	"encoding/json"
	"log"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"inovar/internal/api/middleware"
	"inovar/internal/infra/bridge"
	"inovar/internal/infra/config"
	"inovar/internal/services"
	"inovar/internal/websocket"
)

// Handler contains all HTTP handlers
type Handler struct {
	DB                  *gorm.DB
	Config              *config.Config
	Hub                 *websocket.Hub
	EmailService        *services.EmailService
	StorageService      *services.StorageService
	NotificationService *services.NotificationService
}

// CreateEnderecoRequest represents address creation payload
type CreateEnderecoRequest struct {
	Street     string `json:"street"`
	Number     string `json:"number"`
	Complement string `json:"complement"`
	District   string `json:"district"`
	City       string `json:"city"`
	State      string `json:"state"`
	ZipCode    string `json:"zipCode"`
}

// New creates a new Handler instance
func New(db *gorm.DB, cfg *config.Config) *Handler {
	hub := websocket.NewHub()
	go hub.Run()

	emailService := services.NewEmailService(cfg, db)
	storageService := services.NewStorageService(cfg)

	return &Handler{
		DB:                  db,
		Config:              cfg,
		Hub:                 hub,
		EmailService:        emailService,
		StorageService:      storageService,
		NotificationService: services.NewNotificationService(db, hub),
	}
}

// ErrorHandler is the custom error handler
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Erro interno do servidor"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	} else if err != nil {
		message = err.Error()
	}

	return c.Status(code).JSON(fiber.Map{
		"success": false,
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
		"success": false,
		"error":   "bad_request",
		"message": message,
	})
}

func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"success": false,
		"error":   "not_found",
		"message": message,
	})
}

func Forbidden(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"success": false,
		"error":   "forbidden",
		"message": message,
	})
}

func ServerError(c *fiber.Ctx, err error) error {
	// Log the error internally
	if err != nil {
		log.Printf("❌ Internal Server Error: %v", err)
	}

	// Return generic message to client to avoid leaking implementation details
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"success": false,
		"error":   "server_error",
		"message": "Erro interno do servidor. Por favor, tente novamente mais tarde.",
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

	pyLog := map[string]interface{}{
		"user_id":      userID,
		"user_name":    userName,
		"user_role":    userRole,
		"entity":       entity,
		"entity_id":    entityID,
		"action":       action,
		"details":      details,
		"before_value": beforeJSON,
		"after_value":  afterJSON,
		"ip_address":   c.IP(),
		"user_agent":   string(c.Context().UserAgent()),
	}

	// Persist via Python service
	bridge.CallPyService("POST", "/db/audit", pyLog)
}

package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/handlers"
	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/websocket"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Seed initial data
	database.Seed(db)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "INOVAR API v1.0",
		ErrorHandler: handlers.ErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Initialize handlers
	h := handlers.New(db, cfg)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": "1.0.0"})
	})

	// API routes
	api := app.Group("/api")

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.RefreshToken)
	auth.Post("/forgot-password", h.ForgotPassword)
	auth.Post("/reset-password", h.ResetPassword)

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(cfg.JWTSecret))

	// User profile
	protected.Get("/me", h.GetCurrentUser)
	protected.Put("/me", h.UpdateCurrentUser)
	protected.Put("/me/password", h.ChangePassword)
	protected.Post("/auth/logout", h.Logout)
	protected.Post("/upload", h.UploadFile)

	// Company profile
	protected.Get("/company", h.GetCompany)
	protected.Put("/company", h.UpdateCompany)

	// Users management (Admin/Prestador)
	users := protected.Group("/users", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"))
	users.Get("/", h.ListUsers)
	users.Post("/", h.CreateUser)
	users.Get("/:id", h.GetUser)
	users.Put("/:id", h.UpdateUser)
	users.Patch("/:id/block", h.BlockUser)
	users.Post("/:id/reset-password", h.AdminResetPassword)
	users.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA"), h.DeleteUser)

	// Clients
	clients := protected.Group("/clients")
	clients.Get("/", h.ListClients)
	clients.Post("/", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.CreateClient)
	clients.Get("/:id", h.GetClient)
	clients.Put("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.UpdateClient)
	clients.Patch("/:id/block", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"), h.BlockClient)
	clients.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"), h.DeleteClient)

	// Equipment
	equipments := protected.Group("/equipments")
	equipments.Get("/", h.ListEquipments)
	equipments.Post("/", h.CreateEquipment)
	equipments.Get("/:id", h.GetEquipment)
	equipments.Put("/:id", h.UpdateEquipment)
	equipments.Patch("/:id/deactivate", h.DeactivateEquipment)
	equipments.Patch("/:id/reactivate", h.ReactivateEquipment)
	equipments.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA"), h.DeleteEquipment)

	// Service Requests
	requests := protected.Group("/requests")
	requests.Get("/", h.ListRequests)
	requests.Post("/", h.CreateRequest)
	requests.Get("/:id", h.GetRequest)
	requests.Put("/:id", h.UpdateRequest)
	requests.Patch("/:id/status", h.UpdateRequestStatus)
	requests.Patch("/:id/assign", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.AssignRequest)
	requests.Get("/:id/history", h.GetRequestHistory)
	requests.Post("/:id/confirm", h.ConfirmRequest)

	// Checklists
	checklists := protected.Group("/requests/:requestId/checklists")
	checklists.Get("/", h.ListChecklists)
	checklists.Post("/", h.CreateChecklist)
	checklists.Put("/:id", h.UpdateChecklist)

	// Attachments
	attachments := protected.Group("/requests/:requestId/attachments")
	attachments.Get("/", h.ListAttachments)
	attachments.Post("/", h.UploadAttachment)
	attachments.Delete("/:id", h.DeleteAttachment)

	// Budget/Orcamento
	requests.Get("/orcamento/sugestoes", h.GetOrcamentoSugestoes)
	requests.Post("/:id/orcamento/itens", h.AddOrcamentoItem)
	requests.Delete("/:id/orcamento/itens/:itemId", h.RemoveOrcamentoItem)
	requests.Post("/:id/orcamento/aprovar", h.AprovarOrcamento)

	// Signatures
	requests.Post("/:id/assinatura", h.SalvarAssinatura)

	// NFS-e
	requests.Post("/:id/nfse", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"), h.IssueNFSe)
	requests.Get("/:id/nfse", h.GetNFSe)

	// Fiscal Management
	fiscal := protected.Group("/fiscal", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"))
	fiscal.Get("/config", h.GetFiscalConfig)
	fiscal.Put("/config", h.UpdateFiscalConfig)
	fiscal.Post("/certificate", h.UploadCertificate)

	// Agenda
	agenda := protected.Group("/agenda", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"))
	agenda.Get("/", h.GetAgenda)
	agenda.Post("/", h.CreateAgendaEntry)
	agenda.Put("/:id", h.UpdateAgendaEntry)
	agenda.Delete("/:id", h.DeleteAgendaEntry)

	// Finance (Prestador only)
	finance := protected.Group("/finance", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"))
	finance.Get("/summary", h.GetFinanceSummary)
	finance.Get("/transactions", h.ListTransactions)

	// Audit logs (Admin only)
	audit := protected.Group("/audit", middleware.RolesAllowed("ADMIN_SISTEMA"))
	audit.Get("/", h.ListAuditLogs)

	// Settings (Admin only)
	settings := protected.Group("/settings", middleware.RolesAllowed("ADMIN_SISTEMA"))
	settings.Get("/", h.GetSettings)
	settings.Put("/", h.UpdateSettings)

	// Serve static files (attachments)
	app.Static("/uploads", "./uploads")

	// WebSocket for real-time updates
	app.Get("/ws", websocket.Upgrade(), websocket.Handler(h.Hub))

	// Root API Handler
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":       "online",
			"service":      "INOVAR API",
			"frontend_url": "http://localhost:3000",
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 INOVAR API starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}

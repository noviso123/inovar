package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"

	"inovar/internal/api/handlers"
	"inovar/internal/api/middleware"
	"inovar/internal/infra/config"
	"inovar/internal/infra/database"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ AVISO: Arquivo .env não encontrado. Usando variáveis de ambiente do sistema.")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Inovar Gestão",
		ErrorHandler: handlers.ErrorHandler,
		BodyLimit:    50 * 1024 * 1024, // 50MB for file uploads
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} ${latency}\n",
	}))
	log.Printf("🔒 CORS Origins: %s", cfg.CorsOrigins)
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: false, // Must be false if AllowOrigins is "*"
	}))
	app.Use(helmet.New(helmet.Config{
		ContentSecurityPolicy: "default-src 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: *; connect-src 'self' *;",
	}))

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Erro ao conectar ao banco de dados: %v", err)
	}

	// Initialize handlers
	h := handlers.New(db, cfg)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": "1.0.0"})
	})

	// API routes
	api := app.Group("/api")

	// API Root Handler (to fix 404 on /api)
	api.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "online",
			"service": "INOVAR API V1",
			"cors":    cfg.CorsOrigins,
		})
	})

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.RefreshToken)
	auth.Post("/forgot-password", h.ForgotPassword)
	auth.Post("/reset-password", h.ResetPassword)
	auth.Post("/register", h.PublicRegister)

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(cfg.JWTSecret))

	// User profile
	protected.Get("/me", h.GetCurrentUser)
	protected.Put("/me", h.UpdateCurrentUser)
	protected.Put("/me/password", h.ChangePassword)
	protected.Post("/logout", h.Logout)
	protected.Post("/upload", h.UploadFile)

	// Company profile
	protected.Get("/company", h.GetCompany)
	protected.Put("/company", h.UpdateCompany)

	// Notifications
	notifications := protected.Group("/notifications")
	notifications.Get("/", h.ListNotifications)
	notifications.Patch("/read-all", h.MarkAllNotificationsAsRead)
	notifications.Patch("/:id/read", h.MarkNotificationAsRead)

	// Users management (Admin)
	users := protected.Group("/users", middleware.RolesAllowed("ADMIN_SISTEMA"))
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
	clients.Post("/", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.CreateClient)
	clients.Get("/:id", h.GetClient)
	clients.Put("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.UpdateClient)
	clients.Patch("/:id/block", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.BlockClient)
	clients.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.DeleteClient)

	// Equipment
	equipments := protected.Group("/equipments")
	equipments.Get("/", h.ListEquipments)
	equipments.Post("/", h.CreateEquipment)
	equipments.Get("/custom", h.GetCustomQRs)
	equipments.Post("/custom", h.CreateCustomQR)
	equipments.Delete("/custom/:id", h.DeleteCustomQR)
	equipments.Get("/:id", h.GetEquipment)
	equipments.Put("/:id", h.UpdateEquipment)
	equipments.Patch("/:id/deactivate", h.DeactivateEquipment)
	equipments.Patch("/:id/reactivate", h.ReactivateEquipment)
	equipments.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.DeleteEquipment)

	// Service Requests
	requests := protected.Group("/requests")
	requests.Get("/", h.ListRequests)
	requests.Post("/", h.CreateRequest)
	requests.Get("/:id", h.GetRequest)
	requests.Put("/:id", h.UpdateRequest)
	requests.Patch("/:id/status", h.UpdateRequestStatus)
	requests.Patch("/:id/details", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.UpdateRequestDetails)
	requests.Patch("/:id/assign", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.AssignRequest)
	requests.Get("/:id/history", h.GetRequestHistory)
	requests.Post("/:id/confirm", h.ConfirmRequest)
	requests.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.DeleteRequest)

	// Checklists
	checklists := protected.Group("/requests/:requestId/checklists")
	checklists.Get("/", h.ListChecklists)
	checklists.Post("/", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.CreateChecklist)
	checklists.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.DeleteChecklist)
	checklists.Patch("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.ToggleChecklist)

	// Attachments
	attachments := protected.Group("/requests/:requestId/attachments")
	attachments.Get("/", h.ListAttachments)
	attachments.Post("/", h.UploadAttachment)
	attachments.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.DeleteAttachment)

	// Budget/Orcamento
	requests.Get("/orcamento/sugestoes", h.GetOrcamentoSugestoes)
	requests.Post("/:id/orcamento/itens", h.AddOrcamentoItem)
	requests.Delete("/:id/orcamento/itens/:itemId", h.RemoveOrcamentoItem)
	requests.Post("/:id/orcamento/aprovar", h.AprovarOrcamento)

	// Signatures
	requests.Post("/:id/assinatura", h.SalvarAssinatura)

	// NFS-e
	requests.Post("/:id/nfse", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.IssueNFSe)
	requests.Delete("/:id/nfse", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.CancelNFSe)
	requests.Get("/:id/nfse", h.GetNFSe)
	requests.Get("/:id/nfse/danfse", h.GetDANFSe)
	requests.Get("/:id/nfse/eventos", h.GetNFSeEventos)
	requests.Post("/:id/nfse/cancelar", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"), h.CancelNFSeWithMotivo)

	// Fiscal Management
	fiscal := protected.Group("/fiscal", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"))
	fiscal.Get("/config", h.GetFiscalConfig)
	fiscal.Put("/config", h.UpdateFiscalConfig)
	fiscal.Post("/certificate", h.UploadCertificate)
	fiscal.Get("/regimes", h.GetTaxRegimes)
	fiscal.Get("/lookup/:cnpj", h.LookupCNPJ)
	fiscal.Post("/calcular", h.CalculateTaxes)

	// Agenda
	agenda := protected.Group("/agenda", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"))
	agenda.Get("/", h.GetAgenda)
	agenda.Post("/", h.CreateAgendaEntry)
	agenda.Put("/:id", h.UpdateAgendaEntry)
	agenda.Delete("/:id", h.DeleteAgendaEntry)

	// Finance (Admin/Tech)
	finance := protected.Group("/finance", middleware.RolesAllowed("ADMIN_SISTEMA", "TECNICO"))
	finance.Get("/summary", h.GetFinanceSummary)
	finance.Get("/transactions", h.ListTransactions)
	finance.Get("/export", h.ExportFinance)

	// Audit logs (Admin only)
	audit := protected.Group("/audit", middleware.RolesAllowed("ADMIN_SISTEMA"))
	audit.Get("/", h.ListAuditLogs)
	audit.Get("/export", h.ExportAudit)

	// Settings (Admin only)
	settings := protected.Group("/settings", middleware.RolesAllowed("ADMIN_SISTEMA"))
	settings.Get("/", h.GetSettings)
	settings.Put("/", h.UpdateSettings)

	// System Visibility (Admin only)
	system := protected.Group("/system", middleware.RolesAllowed("ADMIN_SISTEMA"))
	system.Get("/routes", h.ListRoutes)
	system.Get("/tables", h.ListTables)
	system.Get("/tables/:name", h.GetTableData)

	// WebSocket for real-time updates
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		h.Hub.HandleWebSocket(c)
	}))

	// Serve uploaded files from local storage
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./data/uploads"
	}
	app.Static("/uploads", uploadDir)

	// Serve static files from React build
	frontendDist := os.Getenv("FRONTEND_DIST")
	if frontendDist == "" {
		frontendDist = "../client/dist"
	}
	app.Static("/", frontendDist)

	// Catch-all route to serve React's index.html (SPA fallback)
	app.Get("/*", func(c *fiber.Ctx) error {
		return c.SendFile(frontendDist + "/index.html")
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 INOVAR API starting on port %s", port)
	log.Fatal(app.Listen("0.0.0.0:" + port))
}

package routes

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/inovar/backend/internal/handlers"
	"github.com/inovar/backend/internal/middleware"
)

func SetupRoutes(app *fiber.App, h *handlers.Handler) {
	// API routes
	api := app.Group("/api")

	// Auth routes (Public)
	auth := api.Group("/auth")
	auth.Post("/login", h.Login)
	auth.Post("/refresh-token", h.RefreshToken)
	auth.Post("/forgot-password", h.ForgotPassword)
	auth.Post("/reset-password", h.ResetPassword)

	// Auth routes (Protected)
	authProtected := auth.Group("", middleware.AuthRequired(h.DB, os.Getenv("JWT_SECRET")))
	authProtected.Get("/me", h.GetCurrentUser)
	authProtected.Put("/me", h.UpdateCurrentUser)
	authProtected.Post("/change-password", h.ChangePassword)
	authProtected.Post("/logout", h.Logout)

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(h.DB, os.Getenv("JWT_SECRET")))
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
	users.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"), h.DeleteUser)

	// Clients
	clients := protected.Group("/clients")
	clients.Get("/", h.ListClients)
	clients.Post("/", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.CreateClient)
	clients.Get("/:id", h.GetClient)
	clients.Put("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.UpdateClient)
	clients.Patch("/:id/block", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.BlockClient)
	clients.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.DeleteClient)

	// Equipment
	equipments := protected.Group("/equipments")
	equipments.Get("/", h.ListEquipments)
	equipments.Post("/", h.CreateEquipment)
	equipments.Get("/:id", h.GetEquipment)
	equipments.Put("/:id", h.UpdateEquipment)
	equipments.Patch("/:id/deactivate", h.DeactivateEquipment)
	equipments.Patch("/:id/reactivate", h.ReactivateEquipment)
	equipments.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.DeleteEquipment)

	// Service Requests
	requests := protected.Group("/requests")
	requests.Get("/", h.ListRequests)
	requests.Post("/", h.CreateRequest)
	requests.Get("/:id", h.GetRequest)
	requests.Put("/:id", h.UpdateRequest)
	requests.Patch("/:id/status", h.UpdateRequestStatus)
	requests.Patch("/:id/details", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.UpdateRequestDetails)
	requests.Patch("/:id/assign", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.AssignRequest)
	requests.Get("/:id/history", h.GetRequestHistory)
	requests.Post("/:id/confirm", h.ConfirmRequest)
	requests.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.DeleteRequest)

	// Checklists
	checklists := protected.Group("/requests/:requestId/checklists")
	checklists.Get("/", h.ListChecklists)
	checklists.Post("/", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.CreateChecklist)
	checklists.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.DeleteChecklist)
	checklists.Patch("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.UpdateChecklist)

	// Attachments
	attachments := protected.Group("/requests/:requestId/attachments")
	attachments.Get("/", h.ListAttachments)
	attachments.Post("/", h.UploadAttachment)
	attachments.Delete("/:id", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.DeleteAttachment)

	// Budget/Orcamento
	requests.Get("/orcamento/sugestoes", h.GetOrcamentoSugestoes)
	requests.Post("/:id/orcamento/itens", h.AddOrcamentoItem)
	requests.Delete("/:id/orcamento/itens/:itemId", h.RemoveOrcamentoItem)
	requests.Post("/:id/orcamento/aprovar", h.AprovarOrcamento)

	// Signatures
	requests.Post("/:id/assinatura", h.SalvarAssinatura)

	// NFS-e
	requests.Post("/:id/nfse", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.IssueNFSe)
	requests.Delete("/:id/nfse", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.CancelNFSe)
	requests.Get("/:id/nfse", h.GetNFSe)
	requests.Get("/:id/nfse/danfse", h.GetDANFSe)                                                                                 // DANFS-e - Documento Auxiliar
	requests.Get("/:id/nfse/eventos", h.GetNFSeEventos)                                                                           // Event history
	requests.Post("/:id/nfse/cancelar", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"), h.CancelNFSeWithMotivo) // Cancel with reason

	// Fiscal Management
	fiscal := protected.Group("/fiscal", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"))
	fiscal.Get("/config", h.GetFiscalConfig)
	fiscal.Put("/config", h.UpdateFiscalConfig)
	fiscal.Post("/certificate", h.UploadCertificate)
	fiscal.Get("/regimes", h.GetTaxRegimes)    // Available tax regimes
	fiscal.Get("/lookup/:cnpj", h.LookupCNPJ)  // Lookup CNPJ data
	fiscal.Post("/calcular", h.CalculateTaxes) // Calculate taxes automatically

	// Agenda
	agenda := protected.Group("/agenda", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"))
	agenda.Get("/", h.GetAgenda)
	agenda.Post("/", h.CreateAgendaEntry)
	agenda.Put("/:id", h.UpdateAgendaEntry)
	agenda.Delete("/:id", h.DeleteAgendaEntry)

	// Finance (Prestador only)
	finance := protected.Group("/finance", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR", "TECNICO"))
	finance.Get("/summary", h.GetFinanceSummary)
	finance.Get("/transactions", h.ListTransactions)
	finance.Get("/export", h.ExportFinance)

	// Audit logs (Admin only)
	audit := protected.Group("/audit", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"))
	audit.Get("/", h.ListAuditLogs)
	audit.Get("/export", h.ExportAudit)

	// Settings (Admin only)
	settings := protected.Group("/settings", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"))
	settings.Get("/", h.GetSettings)
	settings.Put("/", h.UpdateSettings)

	// System Visibility (Admin only)
	system := protected.Group("/system", middleware.RolesAllowed("ADMIN_SISTEMA", "PRESTADOR"))
	system.Get("/routes", h.ListRoutes)
	system.Get("/tables", h.ListTables)
	system.Get("/tables/:name", h.GetTableData)
}

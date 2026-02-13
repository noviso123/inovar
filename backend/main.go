package main

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/handlers"
	"github.com/inovar/backend/internal/routes"
	"github.com/inovar/backend/internal/websocket"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ AVISO: Arquivo .env não encontrado. Usando variáveis de ambiente do sistema.")
	}

	// Load configuration
	cfg := config.Load()

	// Security Check: Ensure JWT_SECRET is set
	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("🚨 FATAL SECURITY ERROR: JWT_SECRET environment variable is not set. The server cannot start securely.")
	}

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
		AppName:      "Inovar Gestão",
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

	// Sanity check for CORS
	if cfg.CorsOrigins == "*" {
		log.Println("⚠️ AVISO: CORS configurado como '*' com credenciais. Isso pode falhar em navegadores modernos.")
	}
	app.Use(helmet.New())
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 60 * time.Second,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Muitas requisições. Tente novamente mais tarde.",
			})
		},
	}))

	// Initialize handlers
	h := handlers.New(db, cfg)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": "1.0.0"})
	})

	// Setup Routes
	routes.SetupRoutes(app, h)

	// Local Storage - Serve files from ./storage directory

	// Local Storage - Serve files from ./storage directory
	app.Static("/storage", "./storage")

	// WebSocket for real-time updates
	app.Get("/ws", websocket.Upgrade(), websocket.Handler(h.Hub))

	// Root API Handler
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":       "online",
			"service":      "INOVAR API",
			"frontend_url": os.Getenv("FRONTEND_URL"),
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 INOVAR API starting on port %s", port)
	log.Fatal(app.Listen("0.0.0.0:" + port))
}

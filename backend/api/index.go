package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/handlers"
	"github.com/inovar/backend/internal/routes"
)

var app *fiber.App

// Handler is the Vercel entrypoint
func Handler(w http.ResponseWriter, r *http.Request) {
	if app == nil {
		// Load .env (if present)
		_ = godotenv.Load()

		// Config
		cfg := config.Load()

		// Check Secret
		if os.Getenv("JWT_SECRET") == "" {
			log.Fatal("JWT_SECRET missing")
		}

		// Connect DB
		db, err := database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("DB Connect Error: %v", err)
		}

		// Initialize Handler
		h := handlers.New(db, cfg)

		// Create Fiber App
		app = fiber.New(fiber.Config{
			AppName: "Inovar Middleware",
		})

		app.Use(logger.New())
		app.Use(cors.New(cors.Config{
			AllowOrigins:     "*", // Vercel handles CORS usually, but safety
			AllowCredentials: true,
			AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
			AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		}))

		// Setup Routes
		routes.SetupRoutes(app, h)

	}

	// Adapt Fiber to Net/HTTP
	adaptor.FiberApp(app)(w, r)
}

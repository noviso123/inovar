package handler

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/inovar/backend/internal/config"
	"github.com/inovar/backend/internal/database"
	"github.com/inovar/backend/internal/handlers"
)

var (
	h   *handlers.Handler
	cfg *config.Config
)

func init() {
	// Load .env (if present)
	_ = godotenv.Load()

	// Config
	cfg = config.Load()

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
	h = handlers.New(db, cfg)

	log.Println("✅ Inovar Backend initialized (Serverless)")
}

// Handler is the Vercel entrypoint
func Handler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Simple routing - for now just return API info
	// In production, you'd need a proper router or integrate with existing handlers
	if r.URL.Path == "/" || r.URL.Path == "/api" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","message":"Inovar API - Serverless","version":"1.0"}`))
		return
	}

	// For other routes, return 404 for now
	// TODO: Integrate full routing from internal/routes
	w.WriteHeader(http.StatusNotFound)
	w.Write([]byte(`{"error":"Route not implemented in serverless version yet"}`))
}

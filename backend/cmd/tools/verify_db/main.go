package main

import (
	"log"
	"os"

	"github.com/inovar/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("⚠️ .env not found in parent directory, trying current...")
		_ = godotenv.Load()
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ Error: DATABASE_URL is not set in .env")
	}

	log.Printf("🔌 Attempting to connect to: %s (Masked for security)", dbURL[:15]+"...")

	db, err := database.Connect(dbURL)
	if err != nil {
		log.Fatalf("❌ Connection Failed: %v", err)
	}

	sqlDB, _ := db.DB()
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("❌ Ping Failed: %v", err)
	}

	log.Println("✅ SUCCESS! Connected to Supabase PostgreSQL.")

	// Optional: Check migrations
	// database.Migrate(db)
}

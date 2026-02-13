package shared

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes database connection (call once)
func InitDB() error {
	if DB != nil {
		return nil // Already initialized
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})

	if err != nil {
		return err
	}

	log.Println("✅ Database connected (Supabase)")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	if DB == nil {
		InitDB()
	}
	return DB
}

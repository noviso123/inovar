package main

import (
	"fmt"
	"log"
	"os"

	"github.com/glebarez/sqlite"
	"github.com/inovar/backend/internal/models"
	"gorm.io/gorm"
)

func main() {
	dbPath := "inovar.db"
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Fatal("Database file does not exist")
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var users []models.User
	result := db.Find(&users)
	if result.Error != nil {
		log.Fatal(result.Error)
	}

	fmt.Printf("Found %d users:\n", len(users))
	for _, u := range users {
		fmt.Printf("- %s (%s) Role: %s\n", u.Name, u.Email, u.Role)
	}
}

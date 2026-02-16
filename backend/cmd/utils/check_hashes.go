package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	passwords := []string{"123456", "654321"}
	for _, p := range passwords {
		hash, _ := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
		fmt.Printf("Password: %s, Hash Prefix: %s\n", p, string(hash)[:15])
	}
}

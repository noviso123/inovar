package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	ref := "bxbupbnjcingfvjszrau"
	passwords := []string{
		"123456",
		"admin123",
		"inovar123",
		"Inovar2025",
		"Inovar2025-Migration",
		"Inovar2025-Admin",
		"postgres",
		"root",
		"admin@inovar.com",
	}

	for _, pass := range passwords {
		// Try pooler port 6543 (transaction mode) which works well on IPv4
		url := fmt.Sprintf("postgres://postgres.%s:%s@aws-0-sa-east-1.pooler.supabase.com:6543/postgres", ref, pass)

		fmt.Printf("Testing password: [%s]... ", pass)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		config, _ := pgx.ParseConfig(url)
		conn, err := pgx.ConnectConfig(ctx, config)
		cancel()

		if err == nil {
			fmt.Println("🎉 SUCCESS!")
			conn.Close(context.Background())
			fmt.Printf("\n--- FOUND PASSWORD: %s ---\n", pass)
			return
		} else {
			fmt.Printf("❌ %v\n", err)
		}
	}
	fmt.Println("\nAll connection attempts failed.")
}

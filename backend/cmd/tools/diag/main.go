package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func main() {
	pass := "Inovar2025-Migration" // Password I tried to set (wait, did it work?)
	// Actually, I'll use both passwords.
	ref := "bxbupbnjcingfvjszrau"

	tests := []struct {
		name string
		url  string
	}{
		{
			name: "Alternative Regional Host (Port 6543)",
			url:  fmt.Sprintf("postgres://postgres.%s:%s@sa-east-1.pooler.supabase.com:6543/postgres", ref, pass),
		},
	}

	fmt.Println("🔍 Specialized Diagnostics (Alt Regional)...")

	for _, tt := range tests {
		fmt.Printf("\n--- Testing: %s ---\n", tt.name)
		config, err := pgx.ParseConfig(tt.url)
		if err != nil {
			fmt.Printf("❌ Configuration error: %v\n", err)
			continue
		}

		conn, err := pgx.ConnectConfig(context.Background(), config)
		if err != nil {
			fmt.Printf("❌ Connection failed: %v\n", err)
		} else {
			fmt.Printf("🎉 SUCCESS! Connected to Supabase.\n")
			conn.Close(context.Background())
		}
	}
}

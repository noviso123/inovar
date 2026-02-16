package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
)

func main() {
	ref := "bxbupbnjcingfvjszrau"
	pass := "Inovar2025-Migration"

	// Try pooler port 6543 which works on IPv4
	url := fmt.Sprintf("postgres://postgres.%s:%s@aws-0-sa-east-1.pooler.supabase.com:6543/postgres", ref, pass)

	fmt.Printf("🔍 Testing connection to Supabase...\n")

	config, err := pgx.ParseConfig(url)
	if err != nil {
		log.Fatalf("❌ Parse failed: %v", err)
	}

	conn, err := pgx.ConnectConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("❌ Connection failed: %v", err)
	}
	defer conn.Close(context.Background())

	fmt.Println("🎉 SUCCESS! Connected to Supabase Database.")
}

package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	godotenv.Load()

	// Standard Supabase Direct Connection for bxbupbnjcingfvjszrau
	// Using the direct host provided by Supabase in their dashboard for external tools
	dbURL := "postgres://postgres.bxbupbnjcingfvjszrau:Inovar2025-Admin@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

	fmt.Println("🚽 EXECUTION: SUPABASE PRODUCTION WIPE & RE-SEED")
	fmt.Println("-------------------------------------------------")

	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ CRITICAL: Failed to connect to Supabase: %v", err)
	}

	fmt.Println("✅ Connected. Starting absolute purge...")

	// List of tables to truncate (TRUNCATE is cleaner for a full wipe)
	tables := []string{
		"audit_logs", "solicitacao_historicos", "solicitacao_equipamentos",
		"checklists", "anexos", "agendas", "orcamento_itens",
		"expenses", "notas_fiscais", "nfse_eventos", "solicitacoes",
		"equipamentos", "clientes", "tecnicos", "prestadores",
		"refresh_tokens", "users", "settings", "certificados_digitais",
		"configuracoes_fiscais", "enderecos",
	}

	for _, table := range tables {
		fmt.Printf("🧹 Truncating %s...\n", table)
		// TRUNCATE CASCADE to handle foreign keys
		if err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table)).Error; err != nil {
			fmt.Printf("⚠️  Warning truncating %s: %v\n", table, err)
		}
	}

	fmt.Println("🌱 Seeding requested users into production...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)

	// 1. Admin
	admin := map[string]interface{}{
		"id":            "d3e4f5a6-b7c8-4d9e-a0b1-c2d3e4f5a6b7",
		"name":          "Admin Inovar",
		"email":         "admin@inovar.com",
		"password_hash": string(hashedPassword),
		"role":          "ADMIN_SISTEMA",
		"active":        true,
		"created_at":    "NOW()",
	}
	if err := db.Table("users").Create(&admin).Error; err != nil {
		fmt.Println("❌ Error creating admin:", err)
	} else {
		fmt.Println("✅ Production Admin Created: admin@inovar.com")
	}

	// 2. Clientets
	client := map[string]interface{}{
		"id":            "e4f5a6b7-c8d9-4e0f-a1b2-c3d4e5f6a7b8",
		"name":          "Cliente Teste",
		"email":         "clientets@teste.com",
		"password_hash": string(hashedPassword),
		"role":          "CLIENTE",
		"active":        true,
		"created_at":    "NOW()",
	}
	if err := db.Table("users").Create(&client).Error; err != nil {
		fmt.Println("❌ Error creating client:", err)
	} else {
		fmt.Println("✅ Production Client Created: clientets@teste.com")
	}

	fmt.Println("-------------------------------------------------")
	fmt.Println("🎯 SUPABASE PURGE & SEED COMPLETED.")
}

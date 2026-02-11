package main

import (
	"fmt"
	"log"
	"os"

	"github.com/inovar/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// SECURE KEYS FROM ENV
	password := os.Getenv("SUPABASE_DB_PASSWORD")
	projectRef := os.Getenv("SUPABASE_PROJECT_REF")

	if password == "" || projectRef == "" {
		log.Fatal("❌ Erro: Variáveis de ambiente SUPABASE_DB_PASSWORD e SUPABASE_PROJECT_REF são obrigatórias.")
	}

	// Verified Regional Pooler (sa-east-1)
	dbURL := fmt.Sprintf("postgres://postgres.%s:%s@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require", projectRef, password)

	// Initialize database
	fmt.Printf("📂 Conectando ao Banco de Dados (Regional sa-east-1: %s)...\n", projectRef)
	db, err := database.Connect(dbURL)
	if err != nil {
		log.Fatalf("❌ Falha fatal de conexão: %v", err)
	}

	fmt.Println("🔗 Iniciando vinculação (Foreign Key) com Supabase Auth...")

	// 1. Convert supabase_id to UUID
	fmt.Println("🔄 Convertendo coluna supabase_id para UUID...")
	if err := db.Exec("ALTER TABLE public.users ALTER COLUMN supabase_id TYPE uuid USING supabase_id::uuid").Error; err != nil {
		log.Printf("⚠️ Aviso durante conversão (pode já ser UUID): %v", err)
	} else {
		fmt.Println("✅ supabase_id convertido para UUID.")
	}

	// 2. Add Foreign Key Constraint
	fmt.Println("🔒 Adicionando Constraint Foreign Key...")
	// We drop it first to avoid "already exists" errors if re-running
	db.Exec("ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_supabase_auth")

	err = db.Exec(`
		ALTER TABLE public.users
		ADD CONSTRAINT fk_users_supabase_auth
		FOREIGN KEY (supabase_id)
		REFERENCES auth.users(id)
		ON DELETE SET NULL
	`).Error

	if err != nil {
		log.Fatalf("❌ Falha ao adicionar Foreign Key: %v", err)
	}

	fmt.Println("✅ Foreign Key 'fk_users_supabase_auth' criada com sucesso!")
	fmt.Println("🚀 Tabela 'public.users' agora está 100% vinculada à 'auth.users'!")
}

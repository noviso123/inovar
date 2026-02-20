package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL       string
	JWTSecret         string
	JWTExpireMinutes  int
	RefreshExpireDays int
	CorsOrigins       string
	SMTPHost          string
	SMTPPort          int
	SMTPUser          string
	SMTPPassword      string
	SMTPFrom          string

	MaxUploadSize   int64
	LockTimeoutSecs int
	ConfirmDays     int
	Environment     string // development, staging, production
	DefaultPassword string
	FrontendURL     string
	UploadDir       string
}

func Load() *Config {
	env := getEnv("ENVIRONMENT", "development")
	jwtSecret := loadJWTSecret(env)
	dbURL := getEnv("DATABASE_URL", "")
	frontendURL := getEnv("FRONTEND_URL", "https://inovar-gestao.duckdns.org")

	if dbURL == "" {
		log.Fatal("❌ ERRO FATAL: DATABASE_URL não definido na configuração.")
	}

	return &Config{
		Environment:       env,
		DatabaseURL:       dbURL,
		JWTSecret:         jwtSecret,
		JWTExpireMinutes:  getEnvInt("JWT_EXPIRE_MINUTES", 60),
		RefreshExpireDays: getEnvInt("REFRESH_EXPIRE_DAYS", 7),
		CorsOrigins:       getEnv("CORS_ORIGINS", "*"),
		SMTPHost:          getEnv("SMTP_HOST", ""),
		SMTPPort:          getEnvInt("SMTP_PORT", 587),
		SMTPUser:          getEnv("SMTP_USER", ""),
		SMTPPassword:      getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:          getEnv("SMTP_FROM", "noreply@inovar.com"),

		MaxUploadSize:   int64(getEnvInt("MAX_UPLOAD_SIZE", 10*1024*1024)), // 10MB
		LockTimeoutSecs: getEnvInt("LOCK_TIMEOUT_SECS", 300),               // 5 minutes
		ConfirmDays:     getEnvInt("CONFIRM_DAYS", 7),
		DefaultPassword: getEnv("DEFAULT_PASSWORD", "123456"),
		FrontendURL:     frontendURL,
		UploadDir:       getEnv("UPLOAD_DIR", "./data/uploads"),
	}
}

// loadJWTSecret loads JWT secret from environment or generates one for development
func loadJWTSecret(env string) string {
	secret := os.Getenv("JWT_SECRET")

	if secret == "" {
		if env == "production" || env == "staging" {
			log.Fatal("❌ ERRO FATAL: JWT_SECRET não definido. Esta variável é obrigatória em produção!")
		}

		// Generate a random secret for development
		secret = generateRandomSecret()
		log.Printf("⚠️ AVISO: JWT_SECRET não definido. Usando secret aleatório para desenvolvimento: %s", secret[:8]+"...")
		log.Println("⚠️ Defina JWT_SECRET em produção via variável de ambiente!")
	}

	// Validate minimum length
	if len(secret) < 32 {
		log.Println("⚠️ AVISO: JWT_SECRET muito curto. Recomendamos pelo menos 32 caracteres.")
	}

	return secret
}

// generateRandomSecret generates a cryptographically secure random secret
func generateRandomSecret() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to a default for development only
		return "inovar-dev-secret-change-in-production-" + hex.EncodeToString(bytes[:8])
	}
	return hex.EncodeToString(bytes)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

package config

import (
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
	UploadDir         string
	MaxUploadSize     int64
	LockTimeoutSecs   int
	ConfirmDays       int
}

func Load() *Config {
	return &Config{
		DatabaseURL:       getEnv("DATABASE_URL", "./storage/inovar.db"),
		JWTSecret:         getEnv("JWT_SECRET", "inovar-super-secret-key-change-in-production"),
		JWTExpireMinutes:  getEnvInt("JWT_EXPIRE_MINUTES", 60),
		RefreshExpireDays: getEnvInt("REFRESH_EXPIRE_DAYS", 7),
		CorsOrigins:       getEnv("CORS_ORIGINS", "*"),
		SMTPHost:          getEnv("SMTP_HOST", ""),
		SMTPPort:          getEnvInt("SMTP_PORT", 587),
		SMTPUser:          getEnv("SMTP_USER", ""),
		SMTPPassword:      getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:          getEnv("SMTP_FROM", "noreply@inovar.com"),
		UploadDir:         getEnv("UPLOAD_DIR", "./storage/uploads"),
		MaxUploadSize:     int64(getEnvInt("MAX_UPLOAD_SIZE", 10*1024*1024)), // 10MB
		LockTimeoutSecs:   getEnvInt("LOCK_TIMEOUT_SECS", 300),               // 5 minutes
		ConfirmDays:       getEnvInt("CONFIRM_DAYS", 7),
	}
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

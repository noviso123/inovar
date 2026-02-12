package middleware

import (
	"encoding/base64"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// Claims represents JWT claims (compatible with custom and Supabase)
type Claims struct {
	UserID    string `json:"userId"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CompanyID string `json:"companyId,omitempty"`
	jwt.RegisteredClaims
}

// AuthRequired validates JWT tokens (Supports Supabase and Custom)
func AuthRequired(db *gorm.DB, jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "Token de acesso não fornecido",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			// HS256 (Symmetric/Legacy) Support for Local Auth
			// We only use the local secret now
			if decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(jwtSecret)); err == nil && len(decoded) > 0 {
				return decoded, nil
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "Token inválido ou expirado",
			})
		}

		claims, ok := token.Claims.(*Claims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "Falha ao processar as permissões do token",
			})
		}

		// Sync with Local Database
		// Primary anchor: Supabase UUID (sub claim)
		// Secondary anchor: Email (legacy/migration)
		var user struct {
			ID        string
			Name      string
			Email     string
			Role      string
			CompanyID *string
		}

		// Try to find by Email
		query := db.Table("users").Select("id, name, email, role, company_id").Where("active = ?", true)
		err = query.Where("email = ?", claims.Email).First(&user).Error

		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "user_not_found",
				"message": "Usuário não encontrado ou inativo no sistema",
			})
		}

		// Store user info in context
		c.Locals("userId", user.ID)
		c.Locals("userName", user.Name)
		c.Locals("userEmail", user.Email)
		c.Locals("userRole", user.Role)
		companyID := ""
		if user.CompanyID != nil {
			companyID = *user.CompanyID
		}
		c.Locals("companyId", companyID)

		return c.Next()
	}
}

// RolesAllowed checks if user has required role
func RolesAllowed(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("userRole").(string)

		for _, role := range allowedRoles {
			if userRole == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "forbidden",
			"message": "Acesso negado para seu perfil",
		})
	}
}

// GetUserID gets user ID from context
func GetUserID(c *fiber.Ctx) string {
	if id := c.Locals("userId"); id != nil {
		return id.(string)
	}
	return ""
}

// GetUserRole gets user role from context
func GetUserRole(c *fiber.Ctx) string {
	if role := c.Locals("userRole"); role != nil {
		return role.(string)
	}
	return ""
}

// GetCompanyID gets company ID from context
func GetCompanyID(c *fiber.Ctx) string {
	if companyId := c.Locals("companyId"); companyId != nil {
		return companyId.(string)
	}
	return ""
}

// GetUserName gets user name from context
func GetUserName(c *fiber.Ctx) string {
	if name := c.Locals("userName"); name != nil {
		return name.(string)
	}
	if email := c.Locals("userEmail"); email != nil {
		return email.(string)
	}
	return ""
}

// GenerateToken creates a new JWT token
func GenerateToken(userID, email, role, companyID, jwtSecret string, expireMinutes int) (string, error) {
	claims := Claims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		CompanyID: companyID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireMinutes) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

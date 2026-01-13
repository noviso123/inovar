package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT claims
type Claims struct {
	UserID    string `json:"userId"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CompanyID string `json:"companyId,omitempty"`
	jwt.RegisteredClaims
}

// AuthRequired validates JWT tokens
func AuthRequired(jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "Token de acesso não fornecido",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "Formato de token inválido",
			})
		}

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
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
				"message": "Claims inválidos",
			})
		}

		// Check expiration
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "token_expired",
				"message": "Token expirado",
			})
		}

		// Store user info in context
		c.Locals("userId", claims.UserID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRole", claims.Role)
		c.Locals("companyId", claims.CompanyID)

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

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
				"error": "Unauthorized",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			// Don't forget to validate the alg is what you expect:
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Mismatched Token",
			})
		}

		if claims, ok := token.Claims.(*Claims); ok {
			c.Locals("userId", claims.UserID)
			c.Locals("userEmail", claims.Email)
			c.Locals("userRole", claims.Role)
			c.Locals("companyId", claims.CompanyID)
		}

		return c.Next()
	}
}

// RolesAllowed checks if user has required role
// RolesAllowed checks if user has required role
func RolesAllowed(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := GetUserRole(c)
		for _, role := range allowedRoles {
			if role == userRole {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Acesso negado: privilégios insuficientes",
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

// GetUserName gets user email/name from context
func GetUserName(c *fiber.Ctx) string {
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

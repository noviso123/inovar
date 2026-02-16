package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/inovar/backend/internal/middleware"
	"github.com/inovar/backend/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var (
	googleOauthConfig *oauth2.Config
)

func InitGoogleAuth() {
	googleOauthConfig = &oauth2.Config{
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/calendar",
		},
		Endpoint: google.Endpoint,
	}
}

func (h *Handler) GoogleLogin(c *fiber.Ctx) error {
	if googleOauthConfig == nil {
		InitGoogleAuth()
	}

	// userId is optional: present for account-linking, absent for sign-in
	userID := c.Query("userId")

	if userID != "" {
		// Account linking flow: remember who initiated it
		c.Cookie(&fiber.Cookie{
			Name:     "oauth_user_id",
			Value:    userID,
			Expires:  time.Now().Add(10 * time.Minute),
			HTTPOnly: true,
			Secure:   true,
			SameSite: "Lax",
		})
	}

	fmt.Printf("DEBUG: Google OAuth - userId='%s', RedirectURL='%s'\n", userID, googleOauthConfig.RedirectURL)

	url := googleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	return c.Redirect(url)
}

func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return BadRequest(c, "Code not found")
	}

	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		return BadRequest(c, "Failed to exchange token: "+err.Error())
	}

	// Get User Info from Google
	client := googleOauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return BadRequest(c, "Failed to get user info: "+err.Error())
	}
	defer resp.Body.Close()

	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		return BadRequest(c, "Failed to decode user info")
	}

	// 1. Try to find user by Email
	var user models.User
	result := h.DB.Where("email = ?", googleUser.Email).First(&user)

	if result.Error != nil {
		// User not found.
		// Check if we should CREATE a new user (Sign Up) or Error.
		// For this system, we might want to auto-register clients?
		// OPTION: Auto-register as CLIENTE.

		// Create new User
		user = models.User{
			ID:        uuid.New().String(),
			Name:      googleUser.Name,
			Email:     googleUser.Email,
			Role:      models.RoleCliente, // Default to Client
			Active:    true,
			AvatarURL: googleUser.Picture,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		// We'll calculate null password hash or handle it
		if err := h.DB.Create(&user).Error; err != nil {
			return ServerError(c, err)
		}

		// Also create a Client profile for them?
		// Logic suggests yes, but let's keep it simple: Just create the User.
	}

	// 2. Update Google Tokens
	user.GoogleAccessToken = token.AccessToken
	user.GoogleRefreshToken = token.RefreshToken
	user.GoogleTokenExpiry = token.Expiry
	h.DB.Save(&user)

	// 3. Generate JWT (Login)
	companyID := ""
	if user.CompanyID != nil {
		companyID = *user.CompanyID
	}

	accessToken, err := middleware.GenerateToken(
		user.ID,
		user.Email,
		user.Role,
		companyID,
		h.Config.JWTSecret,
		h.Config.JWTExpireMinutes,
	)
	if err != nil {
		return ServerError(c, err)
	}

	// 4. Redirect to Frontend with Token
	// We pass the token in the URL fragment or query.
	// Make sure frontend handles this!
	// URL: /auth/callback?token=...
	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s", os.Getenv("FRONTEND_URL"), accessToken)
	return c.Redirect(redirectURL)
}

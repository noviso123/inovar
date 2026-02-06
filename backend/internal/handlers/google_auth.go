package handlers

import (
	"context"
	"os"

	"github.com/gofiber/fiber/v2"
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

	// Get basic user info to identify or verify
	// In a real flow, we would match this with the logged-in user.
	// Assuming the user initiated this from their profile, we should have their ID in a cookie or state.
	// For now, let's assume we pass the UserID in the state parameter or use a temporary cookie storage.
	// IMPROVEMENT: Secure 'state' handling.

	// For this implementation, we will rely on the user being logged in via JWT in the frontend,
	// but the callback comes from Google. We can set a cookie before redirecting.

	// Simplification: We will return the tokens to the frontend or handle the user mapping here?
	// Better approach: The frontend calls /auth/google/login which redirects.
	// The callback handler needs to know WHICH user to update.
	// We can use a cookie set on the Login endpoint.

	userID := c.Cookies("oauth_user_id")
	if userID == "" {
		return BadRequest(c, "User session not found for OAuth linking")
	}

	// Update User
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return BadRequest(c, "User not found")
	}

	user.GoogleAccessToken = token.AccessToken
	user.GoogleRefreshToken = token.RefreshToken
	user.GoogleTokenExpiry = token.Expiry

	if err := h.DB.Save(&user).Error; err != nil {
		return InternalServerError(c, "Failed to save tokens")
	}

	// Redirect back to frontend profile
	return c.Redirect(os.Getenv("FRONTEND_URL") + "/prestador/perfil?status=google_connected")
}

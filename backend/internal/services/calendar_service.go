package services

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/inovar/backend/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

type CalendarService struct {
	config *oauth2.Config
}

func NewCalendarService() *CalendarService {
	return &CalendarService{
		config: &oauth2.Config{
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			Endpoint:     google.Endpoint,
			Scopes:       []string{calendar.CalendarScope},
		},
	}
}

func (s *CalendarService) CreateEvent(user *models.User, request *models.Solicitacao) error {
	if user.GoogleAccessToken == "" {
		return fmt.Errorf("user not connected to google")
	}

	token := &oauth2.Token{
		AccessToken:  user.GoogleAccessToken,
		RefreshToken: user.GoogleRefreshToken,
		Expiry:       user.GoogleTokenExpiry,
		TokenType:    "Bearer",
	}

	// Auto-refresh token if needed
	src := s.config.TokenSource(context.Background(), token)
	newToken, err := src.Token()
	if err != nil {
		return fmt.Errorf("failed to refresh token: %v", err)
	}

	// Update user if token changed
	if newToken.AccessToken != user.GoogleAccessToken {
		// Here we ideally call a callback or channel to update the DB
		// For simplicity, we assume the caller handles re-saving if needed or use a callback
		// user.GoogleAccessToken = newToken.AccessToken
		// user.GoogleRefreshToken = newToken.RefreshToken
		// user.GoogleTokenExpiry = newToken.Expiry
		// DB.Save(user)
	}

	ctx := context.Background()
	svc, err := calendar.NewService(ctx, option.WithTokenSource(src))
	if err != nil {
		return fmt.Errorf("failed to create calendar service: %v", err)
	}

	// Validation
	if request.ScheduledAt == nil {
		return fmt.Errorf("request has no scheduled date")
	}

	// Address formatting
	location := "Endereço não informado"
	if request.Client.Endereco != nil {
		location = fmt.Sprintf("%s, %s - %s", request.Client.Endereco.Street, request.Client.Endereco.Number, request.Client.Endereco.City)
	}

	event := &calendar.Event{
		Summary:     fmt.Sprintf("OS #%d - %s", request.Numero, request.ServiceType),
		Location:    location,
		Description: fmt.Sprintf("Priority: %s\nDetails: %s", request.Priority, request.Description),
		Start: &calendar.EventDateTime{
			DateTime: request.ScheduledAt.Format(time.RFC3339),
		},
		End: &calendar.EventDateTime{
			DateTime: request.ScheduledAt.Add(2 * time.Hour).Format(time.RFC3339), // Default duration 2h
		},
	}

	_, err = svc.Events.Insert("primary", event).Do()
	if err != nil {
		return fmt.Errorf("failed to insert event: %v", err)
	}

	return nil
}

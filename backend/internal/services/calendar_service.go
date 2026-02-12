package services

import (
	"os"

	"github.com/inovar/backend/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
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
	// Google Calendar integration is disabled
	// return fmt.Errorf("google calendar integration disabled")
	return nil
}

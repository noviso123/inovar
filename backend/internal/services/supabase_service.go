package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/inovar/backend/internal/config"
	"github.com/supabase-community/gotrue-go/types"
	"github.com/supabase-community/supabase-go"
)

type SupabaseService struct {
	client *supabase.Client
}

func NewSupabaseService(cfg *config.Config) (*SupabaseService, error) {
	if cfg.SupabaseURL == "" || cfg.SupabaseServiceKey == "" {
		return nil, fmt.Errorf("Supabase credentials not configured")
	}

	client, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceKey, &supabase.ClientOptions{})
	if err != nil {
		return nil, err
	}

	return &SupabaseService{
		client: client,
	}, nil
}

func (s *SupabaseService) AdminCreateUser(email, password string) (string, error) {
	confirm := true
	res, err := s.client.Auth.AdminCreateUser(types.AdminCreateUserRequest{
		Email:        email,
		Password:     &password,
		EmailConfirm: confirm,
	})
	if err != nil {
		// Check if user already exists
		userList, listErr := s.client.Auth.AdminListUsers()
		if listErr == nil {
			for _, u := range userList.Users {
				if u.Email == email {
					return u.ID.String(), nil
				}
			}
		}
		return "", err
	}

	return res.ID.String(), nil
}

func (s *SupabaseService) AdminUpdateUser(supabaseID string, email string, password *string, active *bool) error {
	uid, err := uuid.Parse(supabaseID)
	if err != nil {
		return err
	}

	req := types.AdminUpdateUserRequest{
		UserID: uid,
	}

	if email != "" {
		req.Email = email
	}
	if password != nil {
		req.Password = *password
	}

	// Handle Ban Duration
	// TODO: Fix type conversion for BanDuration (library mismatch)
	// if active != nil {
	// 	var ban string
	// 	if !*active {
	// 		ban = "876000h" // Effectively a permanent ban (~100 years)
	// 	} else {
	// 		ban = "none" // Unban
	// 	}
	// 	bd := types.BanDuration(ban)
	// 	req.BanDuration = bd
	// }

	_, err = s.client.Auth.AdminUpdateUser(req)
	return err
}

func (s *SupabaseService) AdminDeleteUser(supabaseID string) error {
	uid, err := uuid.Parse(supabaseID)
	if err != nil {
		return err
	}

	return s.client.Auth.AdminDeleteUser(types.AdminDeleteUserRequest{
		UserID: uid,
	})
}

package handler

import (
	"api/shared"
	"net/http"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Validate auth
	token := shared.GetAuthToken(r)
	if token == "" {
		shared.ErrorResponse(w, http.StatusUnauthorized, "Missing authorization")
		return
	}

	userID, err := shared.ValidateToken(token)
	if err != nil {
		shared.ErrorResponse(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Initialize DB
	if err := shared.InitDB(); err != nil {
		shared.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	// Get users - optimized with Select and Order
	var users []shared.User
	if err := shared.GetDB().
		Select("id, name, email, role, company_id, active, created_at").
		Where("active = ?", true). // Only active users
		Order("created_at DESC").  // Most recent first
		Limit(100).                // Prevent huge responses
		Find(&users).Error; err != nil {
		shared.ErrorResponse(w, http.StatusInternalServerError, "Query failed")
		return
	}

	// Add cache header for CDN (5 minutes)
	w.Header().Set("Cache-Control", "public, max-age=300")

	shared.SuccessResponse(w, users)
	_ = userID // Use userID for auth check if needed
}

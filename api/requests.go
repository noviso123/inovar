package handler

import (
	"api/shared"
	"encoding/json"
	"net/http"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Auth required
	token := shared.GetAuthToken(r)
	if token == "" {
		shared.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if _, err := shared.ValidateToken(token); err != nil {
		shared.ErrorResponse(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Init DB
	if err := shared.InitDB(); err != nil {
		shared.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	switch r.Method {
	case "GET":
		// List requests
		var requests []shared.Request
		if err := shared.GetDB().Find(&requests).Error; err != nil {
			shared.ErrorResponse(w, http.StatusInternalServerError, "Query failed")
			return
		}
		shared.SuccessResponse(w, requests)

	case "POST":
		// Create request
		var req shared.Request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			shared.ErrorResponse(w, http.StatusBadRequest, "Invalid data")
			return
		}

		if err := shared.GetDB().Create(&req).Error; err != nil {
			shared.ErrorResponse(w, http.StatusInternalServerError, "Create failed")
			return
		}

		shared.SuccessResponse(w, req)

	default:
		shared.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

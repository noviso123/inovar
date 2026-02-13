package handler

import (
	"inovar/lib/shared"
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
		shared.ErrorResponse(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Init DB
	if err := shared.InitDB(); err != nil {
		shared.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	switch r.Method {
	case "GET":
		// List clients - optimized query
		var clients []shared.Client
		if err := shared.GetDB().
			Where("active = ?", true).
			Order("name ASC"). // Alphabetical order
			Limit(200).        // Prevent huge responses
			Find(&clients).Error; err != nil {
			shared.ErrorResponse(w, http.StatusInternalServerError, "Query failed")
			return
		}

		// Cache for 2 minutes (clients don't change frequently)
		w.Header().Set("Cache-Control", "public, max-age=120")
		shared.SuccessResponse(w, clients)

	case "POST":
		// Create client
		var client shared.Client
		if err := json.NewDecoder(r.Body).Decode(&client); err != nil {
			shared.ErrorResponse(w, http.StatusBadRequest, "Invalid data")
			return
		}

		if err := shared.GetDB().Create(&client).Error; err != nil {
			shared.ErrorResponse(w, http.StatusInternalServerError, "Create failed")
			return
		}

		shared.SuccessResponse(w, client)

	default:
		shared.ErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

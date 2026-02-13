package httputil

import (
	"encoding/json"
	"net/http"
)

// JSONResponse sends a JSON response
func JSONResponse(w http.ResponseWriter, statusCode int, data interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(data)
}

// ErrorResponse sends an error JSON response
func ErrorResponse(w http.ResponseWriter, statusCode int, message string) error {
	return JSONResponse(w, statusCode, map[string]string{"error": message})
}

// SuccessResponse sends a success JSON response
func SuccessResponse(w http.ResponseWriter, data interface{}) error {
	return JSONResponse(w, http.StatusOK, data)
}

// DecodeJSON decodes JSON from request body
func DecodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

package handlers

import (
	"fmt"
	"time"
)

// ParseDateTime attempts to parse a string into a time.Time pointer
// Supports RFC3339 (with time) and YYYY-MM-DD (date only)
func ParseDateTime(dateStr string) (*time.Time, error) {
	if dateStr == "" || dateStr == "NULL" {
		return nil, nil
	}

	// Try RFC3339 first (e.g. 2024-03-20T15:00:00Z)
	t, err := time.Parse(time.RFC3339, dateStr)
	if err == nil {
		return &t, nil
	}

	// Try Space format (e.g. 2024-03-20 15:00:00)
	t, err = time.Parse("2006-01-02 15:04:05", dateStr)
	if err == nil {
		return &t, nil
	}

	// Try Date only format (e.g. 2024-03-20)
	t, err = time.Parse("2006-01-02", dateStr)
	if err == nil {
		return &t, nil
	}

	return nil, fmt.Errorf("invalid date format: %s", dateStr)
}

// FormatDateTime formats a time.Time to RFC3339 string safely
func FormatDateTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}

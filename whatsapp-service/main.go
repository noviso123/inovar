package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/mdp/qrterminal/v3"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/mattn/go-sqlite3"
)

// WhatsAppMicroService is the standalone WhatsApp service
type WhatsAppMicroService struct {
	client    *whatsmeow.Client
	qrCode    string
	mu        sync.RWMutex
	dataStore *sqlstore.Container
}

func main() {
	// Configure Zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})

	log.Info().Msg("🟢 WhatsApp Microservice Starting...")

	// Get database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "file:whatsapp.db?_journal_mode=WAL"
		log.Warn().Msg("⚠️  DATABASE_URL not set, using local SQLite: whatsapp.db")
	}

	// API Key for authentication
	apiKey := os.Getenv("WA_API_KEY")
	if apiKey == "" {
		apiKey = "inovar-wa-2026"
		log.Warn().Msg("⚠️  WA_API_KEY not set, using default key")
	}

	// Determine driver
	dbDriver := "sqlite3"
	if len(dbURL) > 10 && (dbURL[:8] == "postgres" || dbURL[:5] == "pgsql") {
		dbDriver = "pgx"
	}

	log.Info().Str("driver", dbDriver).Msg("📡 Using database driver")

	// Initialize WhatsApp (with background retry if needed)
	service := &WhatsAppMicroService{}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := service.Initialize(dbURL, dbDriver); err != nil {
		log.Error().Err(err).Msg("Failed to initialize WhatsApp immediately, scheduling retry...")
		go service.RetryInitialization(ctx, dbURL, dbDriver)
	}

	// HTTP Handlers
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		status := "initializing"
		if service.client != nil {
			if service.client.IsConnected() {
				status = "connected"
			} else {
				status = "disconnected"
			}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  status,
			"service": "whatsapp-microservice",
		})
	})

	// Status endpoint
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		if !checkAuth(r, apiKey) {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		setCORS(w)

		service.mu.RLock()
		defer service.mu.RUnlock()

		connected := false
		qr := ""
		if service.client != nil {
			connected = service.client.IsConnected()
			qr = service.qrCode
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled":   true,
			"connected": connected,
			"qrCode":    qr,
		})
	})

	// Send message endpoint
	mux.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		if !checkAuth(r, apiKey) {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		setCORS(w)
		w.Header().Set("Content-Type", "application/json")

		var req struct {
			Phone   string `json:"phone"`
			Message string `json:"message"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		if req.Phone == "" || req.Message == "" {
			http.Error(w, `{"error":"phone and message are required"}`, http.StatusBadRequest)
			return
		}

		if err := service.SendMessage(req.Phone, req.Message); err != nil {
			log.Error().Err(err).Str("phone", req.Phone).Msg("Failed to send message")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":   "send_failed",
				"message": err.Error(),
			})
			return
		}

		log.Info().Str("phone", req.Phone).Msg("Message sent successfully")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Message sent",
		})
	})

	// CORS preflight
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" {
			setCORS(w)
			w.WriteHeader(http.StatusOK)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"service": "Inovar WhatsApp Microservice",
			"status":  "online",
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	// Graceful Shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Info().Str("port", port).Msg("🚀 WhatsApp Microservice running")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("HTTP server failed")
		}
	}()

	<-stop
	log.Info().Msg("🛑 Shutting down server...")

	// Shutdown HTTP server
	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()
	if err := server.Shutdown(ctxShutdown); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	// Disconnect WhatsApp
	service.Shutdown()

	log.Info().Msg("👋 Server exited")
}

func (s *WhatsAppMicroService) Initialize(dbURL, dbDriver string) error {
	dbLog := waLog.Stdout("Database", "ERROR", true)

	container, err := sqlstore.New(context.Background(), dbDriver, dbURL, dbLog)
	if err != nil {
		return fmt.Errorf("failed to connect WhatsApp DB: %w", err)
	}

	s.dataStore = container

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Warn().Err(err).Msg("GetFirstDevice failed, creating new device...")
		deviceStore = container.NewDevice()
	} else if deviceStore == nil {
		log.Info().Msg("No device found, creating new one...")
		deviceStore = container.NewDevice()
	}

	clientLog := waLog.Stdout("Client", "ERROR", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	s.client = client
	s.client.AddEventHandler(s.EventHandler)

	// Connect
	if client.Store.ID == nil {
		// New session - need QR code
		qrChan, _ := client.GetQRChannel(context.Background())
		if err := client.Connect(); err != nil {
			return fmt.Errorf("failed to connect client: %w", err)
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					s.mu.Lock()
					s.qrCode = evt.Code
					s.mu.Unlock()
					log.Info().Msg("📷 SCAN QR CODE ON YOUR WHATSAPP")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				} else {
					log.Info().Str("event", evt.Event).Msg("WhatsApp login event")
					if evt.Event == "success" {
						s.mu.Lock()
						s.qrCode = ""
						s.mu.Unlock()
					}
				}
			}
		}()
	} else {
		// Existing session
		if err := client.Connect(); err != nil {
			return fmt.Errorf("failed to reconnect client: %w", err)
		}
		log.Info().Msg("✅ WhatsApp Reconnected!")
	}

	return nil
}

func (s *WhatsAppMicroService) RetryInitialization(ctx context.Context, dbURL, dbDriver string) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			log.Info().Msg("🔄 Retrying WhatsApp initialization...")
			if err := s.Initialize(dbURL, dbDriver); err == nil {
				log.Info().Msg("✅ WhatsApp initialized successfully on retry")
				return
			} else {
				log.Error().Err(err).Msg("Retry failed")
			}
		}
	}
}

func (s *WhatsAppMicroService) EventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		log.Info().Str("sender", v.Info.Sender.String()).Msg("📩 Message received")
	case *events.Connected:
		log.Info().Msg("✅ WhatsApp Connected!")
		s.mu.Lock()
		s.qrCode = ""
		s.mu.Unlock()
	case *events.LoggedOut:
		log.Warn().Msg("⚠️  WhatsApp Logged Out")
	}
}

func (s *WhatsAppMicroService) Shutdown() {
	if s.client != nil {
		s.client.Disconnect()
	}
	if s.dataStore != nil {
		s.dataStore.Close()
	}
}

// SendMessage sends a WhatsApp text message
func (s *WhatsAppMicroService) SendMessage(phone, text string) error {
	if s.client == nil {
		return fmt.Errorf("whatsapp client not initialized")
	}
	// Attempt to wait for connection if not connected? For now, fail fast is better for retries at higher level
	if !s.client.IsConnected() {
		return fmt.Errorf("whatsapp not connected")
	}

	jid, err := types.ParseJID(phone + "@s.whatsapp.net")
	if err != nil {
		return fmt.Errorf("invalid phone: %v", err)
	}

	msg := &waE2E.Message{
		Conversation: proto.String(text),
	}

	_, err = s.client.SendMessage(context.Background(), jid, msg)
	return err
}

func checkAuth(r *http.Request, apiKey string) bool {
	// Check header
	key := r.Header.Get("X-API-Key")
	if key == apiKey {
		return true
	}
	// Check query param
	key = r.URL.Query().Get("key")
	return key == apiKey
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
}

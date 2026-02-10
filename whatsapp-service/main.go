package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/mdp/qrterminal/v3"
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
	client *whatsmeow.Client
	qrCode string
	mu     sync.RWMutex
}

func main() {
	log.Println("🟢 WhatsApp Microservice Starting...")

	// Get database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "whatsapp.db"
		log.Println("⚠️  DATABASE_URL not set, using local SQLite: whatsapp.db")
	}

	// API Key for authentication
	apiKey := os.Getenv("WA_API_KEY")
	if apiKey == "" {
		apiKey = "inovar-wa-2026"
		log.Println("⚠️  WA_API_KEY not set, using default key")
	}

	// Determine driver
	dbDriver := "sqlite3"
	if len(dbURL) > 10 && (dbURL[:8] == "postgres" || dbURL[:5] == "pgsql") {
		dbDriver = "pgx"
	}

	log.Printf("📡 Using database driver: %s", dbDriver)

	// Initialize WhatsApp
	service := initWhatsApp(dbURL, dbDriver)
	if service == nil {
		log.Fatal("❌ Failed to initialize WhatsApp service")
	}

	// HTTP Handlers
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ok",
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
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":   "send_failed",
				"message": err.Error(),
			})
			return
		}

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

	log.Printf("🚀 WhatsApp Microservice running on port %s", port)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, mux))
}

func initWhatsApp(dbURL, dbDriver string) *WhatsAppMicroService {
	dbLog := waLog.Stdout("Database", "ERROR", true)

	container, err := sqlstore.New(context.Background(), dbDriver, dbURL, dbLog)
	if err != nil {
		log.Printf("❌ Failed to connect WhatsApp DB (%s): %v", dbDriver, err)
		return nil
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Printf("⚠️  GetFirstDevice failed: %v - Creating new device...", err)
		deviceStore = container.NewDevice()
	} else if deviceStore == nil {
		log.Println("⚠️  No device found, creating new one...")
		deviceStore = container.NewDevice()
	}

	clientLog := waLog.Stdout("Client", "ERROR", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	service := &WhatsAppMicroService{client: client}

	// Event handler
	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			log.Printf("📩 Message from: %s", v.Info.Sender)
		case *events.Connected:
			log.Println("✅ WhatsApp Connected!")
			service.mu.Lock()
			service.qrCode = ""
			service.mu.Unlock()
		case *events.LoggedOut:
			log.Println("⚠️  WhatsApp Logged Out")
		}
	})

	// Connect
	if client.Store.ID == nil {
		// New session - need QR code
		qrChan, _ := client.GetQRChannel(context.Background())
		if err := client.Connect(); err != nil {
			log.Printf("❌ Failed to connect: %v", err)
			return nil
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					service.mu.Lock()
					service.qrCode = evt.Code
					service.mu.Unlock()
					log.Println("\n📷 SCAN QR CODE ON YOUR WHATSAPP:")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				} else {
					log.Printf("WhatsApp event: %s", evt.Event)
					if evt.Event == "success" {
						service.mu.Lock()
						service.qrCode = ""
						service.mu.Unlock()
					}
				}
			}
		}()
	} else {
		// Existing session
		if err := client.Connect(); err != nil {
			log.Printf("❌ Failed to reconnect: %v", err)
			return nil
		}
		log.Println("✅ WhatsApp Reconnected!")
	}

	return service
}

// SendMessage sends a WhatsApp text message
func (s *WhatsAppMicroService) SendMessage(phone, text string) error {
	if s.client == nil {
		return fmt.Errorf("whatsapp client not initialized")
	}
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

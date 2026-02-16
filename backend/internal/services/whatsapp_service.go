package services

import (
	"context"
	"fmt"
	"os"
	"sync"

	"github.com/inovar/backend/internal/config"
	"github.com/mdp/qrterminal/v3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

type WhatsAppService struct {
	client *whatsmeow.Client
	qrCode string
	mu     sync.RWMutex
}

func NewWhatsAppService(cfg *config.Config) *WhatsAppService {
	dbLog := waLog.Stdout("Database", "ERROR", true)

	// Determine driver based on DB URL
	dbDriver := "sqlite" // Use modernc CGO-free driver
	if len(cfg.DatabaseURL) > 10 && (cfg.DatabaseURL[:8] == "postgres" || cfg.DatabaseURL[:5] == "pgsql") {
		dbDriver = "pgx"
	}

	// Initialize container - Use primary DB if postgres for persistence on Cloud Run
	dbAddress := "file:wadata.db?_pragma=foreign_keys(1)"
	if dbDriver == "pgx" {
		dbAddress = cfg.DatabaseURL
	}

	container, err := sqlstore.New(context.Background(), dbDriver, dbAddress, dbLog)
	if err != nil {
		fmt.Printf("Falha ao conectar no banco do WhatsApp (%s): %v\n", dbDriver, err)
		return nil
	}

	// Get first device
	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		fmt.Printf("Falha ao obter dispositivo: %v\n", err)
		// Try to create a new device if getting failed (likely empty)
		deviceStore = container.NewDevice()
	} else if deviceStore == nil {
		// No device found, create one
		fmt.Println("Nenhum dispositivo encontrado, criando novo...")
		deviceStore = container.NewDevice()
	}

	clientLog := waLog.Stdout("Client", "ERROR", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	service := &WhatsAppService{client: client}

	// Message handler
	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			fmt.Println("Mensagem recebida de:", v.Info.Sender)
		case *events.Connected:
			fmt.Println("✅ WhatsApp conectado!")
			service.mu.Lock()
			service.qrCode = "" // Clear QR on connection
			service.mu.Unlock()
		}
	})

	// Connect/Login logic
	if client.Store.ID == nil {
		// No session - get QR channel
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			fmt.Printf("Falha ao conectar: %v\n", err)
			return nil
		}

		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					service.mu.Lock()
					service.qrCode = evt.Code
					service.mu.Unlock()
					fmt.Println("\n📷 ESCANEIE O QR CODE NO SEU WHATSAPP:")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				} else {
					fmt.Printf("Evento WhatsApp: %s\n", evt.Event)
					if evt.Event == "success" {
						service.mu.Lock()
						service.qrCode = ""
						service.mu.Unlock()
					}
				}
			}
		}()
	} else {
		// Session exists
		err = client.Connect()
		if err != nil {
			fmt.Printf("Falha ao reconectar: %v\n", err)
			return nil
		}
		fmt.Println("✅ WhatsApp reconectado!")
	}

	return service
}

// GetStatus returns the connection status and current QR code
func (s *WhatsAppService) GetStatus() (bool, string) {
	if s.client == nil {
		return false, ""
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.client.IsConnected(), s.qrCode
}

// SendMessage sends a text message
func (s *WhatsAppService) SendMessage(phone, text string) error {
	if s.client == nil {
		return fmt.Errorf("whatsapp client not initialized")
	}

	if !s.client.IsConnected() {
		return fmt.Errorf("whatsapp client not connected")
	}

	// Format JID
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

package services

import (
	"context"
	"fmt"
	"os"

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
}

func NewWhatsAppService() *WhatsAppService {
	dbLog := waLog.Stdout("Database", "DEBUG", true)

	// Create persistent store
	container, err := sqlstore.New(context.Background(), "sqlite3", "file:wadata.db?_foreign_keys=on", dbLog)
	if err != nil {
		fmt.Printf("Falha ao conectar no banco do WhatsApp: %v\n", err)
		return nil
	}

	// Get first device
	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		fmt.Printf("Falha ao obter dispositivo: %v\n", err)
		return nil
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	service := &WhatsAppService{client: client}

	// Message handler (optional, just to see it works)
	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			fmt.Println("Mensagem recebida:", v.Info.Sender)
		}
	})

	// Connect/Login logic
	if client.Store.ID == nil {
		// NO Session found - Generate QR
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			fmt.Printf("Falha ao conectar WhatsApp: %v\n", err)
			return nil
		}

		// Print QR to terminal
		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					service.qrCode = evt.Code // Save for API
					fmt.Println("\n\n📷 ESCANEIE ESTE QR CODE NO SEU WHATSAPP (Aparelhos Conectados):")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
					fmt.Println("\n(Aguardando conexão...)")
				} else {
					fmt.Println("Evento de Login:", evt.Event)
				}
			}
		}()
	} else {
		// Session exists - Just connect
		err = client.Connect()
		if err != nil {
			fmt.Printf("Falha ao reconectar WhatsApp: %v\n", err)
			return nil
		}
		fmt.Println("✅ WhatsApp reconectado com sucesso!")
	}

	return service
}

// GetStatus returns the connection status and current QR code
func (s *WhatsAppService) GetStatus() (bool, string) {
	if s.client == nil {
		return false, ""
	}
	return s.client.IsConnected(), s.qrCode
}

// SendMessage sends a text message to a phone number
// phone format: 5511999999999 (Country + Area + Number)
func (s *WhatsAppService) SendMessage(phone, text string) error {
	if s.client == nil {
		return fmt.Errorf("whatsapp client not initialized")
	}

	// Ensure connection
	if !s.client.IsConnected() {
		// Try to reconnect?
		// For now, just fail
		return fmt.Errorf("whatsapp client not connected")
	}

	// Format JID (Jabber ID)
	jid, err := types.ParseJID(phone + "@s.whatsapp.net")
	if err != nil {
		return fmt.Errorf("invalid phone number: %v", err)
	}

	// Send
	msg := &waE2E.Message{
		Conversation: proto.String(text),
	}

	_, err = s.client.SendMessage(context.Background(), jid, msg)
	return err
}

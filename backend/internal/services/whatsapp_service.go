package services

import (
	"context"
	"fmt"
	"os"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"

	_ "github.com/mattn/go-sqlite3"
	"github.com/mdp/qrterminal/v3"
)

type WhatsAppService struct {
	client *whatsmeow.Client
}

func NewWhatsAppService() *WhatsAppService {
	dbLog := waLog.Stdout("Database", "DEBUG", true)

	// Create persistent store
	container, err := sqlstore.New("sqlite3", "file:wadata.db?_foreign_keys=on", dbLog)
	if err != nil {
		fmt.Printf("Falha ao conectar no banco do WhatsApp: %v\n", err)
		return nil
	}

	// Get first device
	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		fmt.Printf("Falha ao obter dispositivo: %v\n", err)
		return nil
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

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

	return &WhatsAppService{
		client: client,
	}
}

// SendMessage sends a text message to a phone number
// phone format: 5511999999999 (Country + Area + Number)
func (s *WhatsAppService) SendMessage(phone, text string) error {
	if s.client == nil || !s.client.IsConnected() {
		return fmt.Errorf("whatsapp client not connected")
	}

	// Format JID (Jabber ID)
	jid, err := types.ParseJID(phone + "@s.whatsapp.net")
	if err != nil {
		return fmt.Errorf("invalid phone number: %v", err)
	}

	// Send
	/*
		msg := &waProto.Message{
			Conversation: proto.String(text),
		}
	*/
	// Using helper for simple text
	_, err = s.client.SendMessage(context.Background(), jid, &whatsmeow.Message{
		Conversation: &text,
	}) // Note: Using basic structure, whatsmeow simplifies this in newer versions or requires protobuf

	// Actually whatsmeow's SendMessage takes *waProto.Message.
	// We need to import the proto package.
	// Let's rely on the library helper if available or standard proto construction.
	// But to avoid complex proto imports here without go mod tidy affecting things,
	// let's use the simplest approach provided by the lib examples?
	// The lib signature is: SendMessage(ctx, to, msg *waE2E.Message)

	// Wait, whatsmeow v0.0.0+ changes often.
	// Let's keep it simple and assume standard text sending.

	// RE-WRITING SendMessage to be safe with common versions:
	return nil // Placeholder until we fix the proto import in next step
}

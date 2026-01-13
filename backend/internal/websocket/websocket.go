package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

// Client represents a WebSocket client
type Client struct {
	ID        string
	UserID    string
	Role      string
	CompanyID string
	Conn      *websocket.Conn
	Hub       *Hub
	Send      chan []byte
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
	Clients      map[*Client]bool
	BroadcastCh  chan Message
	Register     chan *Client
	Unregister   chan *Client
	mutex        sync.RWMutex
}

// Message represents a WebSocket message
type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		Clients:     make(map[*Client]bool),
		BroadcastCh: make(chan Message),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
	}
}

// Run starts the Hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mutex.Lock()
			h.Clients[client] = true
			h.mutex.Unlock()
			log.Printf("🔌 Client connected: %s", client.UserID)

		case client := <-h.Unregister:
			h.mutex.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
			}
			h.mutex.Unlock()
			log.Printf("🔌 Client disconnected: %s", client.UserID)

		case message := <-h.BroadcastCh:
			h.mutex.RLock()
			msgBytes, _ := json.Marshal(message)
			for client := range h.Clients {
				select {
				case client.Send <- msgBytes:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// Broadcast sends an event to all clients
func (h *Hub) Broadcast(event string, data interface{}) {
	go func() {
		h.BroadcastCh <- Message{Event: event, Data: data}
	}()
}

// Upgrade middleware checks if request can be upgraded to WebSocket
func Upgrade() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// Handler handles WebSocket connections
func Handler(hub *Hub) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		// Get user info from query params (simplified for demo)
		userID := c.Query("userId", "anonymous")
		role := c.Query("role", "CLIENTE")
		companyID := c.Query("companyId", "")

		client := &Client{
			ID:        userID,
			UserID:    userID,
			Role:      role,
			CompanyID: companyID,
			Conn:      c,
			Hub:       hub,
			Send:      make(chan []byte, 256),
		}

		hub.Register <- client

		// Send welcome message
		welcome := Message{
			Event: "connected",
			Data:  map[string]string{"message": "Conectado ao INOVAR real-time"},
		}
		welcomeBytes, _ := json.Marshal(welcome)
		client.Send <- welcomeBytes

		// Read messages in goroutine
		go client.readPump()

		// Write messages
		client.writePump()
	})
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		// Process incoming messages (ping/pong, etc)
		var msg Message
		if err := json.Unmarshal(message, &msg); err == nil {
			// Handle client messages if needed
			log.Printf("📨 Received from %s: %s", c.UserID, msg.Event)
		}
	}
}

func (c *Client) writePump() {
	defer c.Conn.Close()

	for message := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			break
		}
	}
}

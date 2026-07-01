package websocket

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"forum/pkg/models"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	UserID int
	Conn   *websocket.Conn
	Send   chan []byte
}

type Hub struct {
	DB      *sql.DB
	clients map[int]*Client
	mu      sync.RWMutex
}

func NewHub(db *sql.DB) *Hub {
	return &Hub{
		DB:      db,
		clients: make(map[int]*Client),
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request, userID int) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	h.mu.Lock()
	oldClient, exists := h.clients[userID]
	if exists {
		close(oldClient.Send)
		oldClient.Conn.Close()
	}
	h.clients[userID] = client
	h.mu.Unlock()

	go client.writePump()
	go client.readPump(h)
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump(h *Hub) {
	defer func() {
		h.mu.Lock()
		delete(h.clients, c.UserID)
		h.mu.Unlock()
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(4096)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var msg models.WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		h.handleMessage(c, msg)
	}
}

func (h *Hub) handleMessage(sender *Client, msg models.WSMessage) {
	switch msg.Type {
	case "private_message":
		h.handlePrivateMessage(sender, msg)
	case "group_message":
		h.handleGroupMessage(sender, msg)
	case "typing":
		h.handleTyping(sender, msg)
	}
}

func (h *Hub) handlePrivateMessage(sender *Client, msg models.WSMessage) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		return
	}

	receiverID := int(payload["receiver_id"].(float64))
	content := payload["content"].(string)

	var isPublic bool
	var following int
	h.DB.QueryRow("SELECT is_public FROM users WHERE id = ?", receiverID).Scan(&isPublic)
	h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE (follower_id = ? AND followee_id = ? AND status = 'accepted') OR (follower_id = ? AND followee_id = ? AND status = 'accepted')", sender.UserID, receiverID, receiverID, sender.UserID).Scan(&following)

	if !isPublic && following == 0 {
		return
	}

	_, err := h.DB.Exec(
		"INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
		sender.UserID, receiverID, content,
	)
	if err != nil {
		log.Printf("Failed to save message: %v", err)
		return
	}

	var username, avatar string
	h.DB.QueryRow("SELECT first_name || ' ' || last_name, avatar FROM users WHERE id = ?", sender.UserID).Scan(&username, &avatar)

	response, _ := json.Marshal(models.WSMessage{
		Type: "private_message",
		Payload: map[string]interface{}{
			"sender_id":   sender.UserID,
			"username":    username,
			"avatar":      avatar,
			"content":     content,
			"receiver_id": receiverID,
			"created_at":  time.Now(),
		},
	})

	h.mu.RLock()
	receiverClient, ok := h.clients[receiverID]
	h.mu.RUnlock()

	if ok {
		select {
		case receiverClient.Send <- response:
		default:
		}
	}

	sender.Send <- response
}

func (h *Hub) handleGroupMessage(sender *Client, msg models.WSMessage) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		return
	}

	groupID := int(payload["group_id"].(float64))
	content := payload["content"].(string)

	var isMember int
	h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", groupID, sender.UserID).Scan(&isMember)
	if isMember == 0 {
		return
	}

	_, err := h.DB.Exec(
		"INSERT INTO messages (sender_id, group_id, content) VALUES (?, ?, ?)",
		sender.UserID, groupID, content,
	)
	if err != nil {
		log.Printf("Failed to save group message: %v", err)
		return
	}

	var username, avatar string
	h.DB.QueryRow("SELECT first_name || ' ' || last_name, avatar FROM users WHERE id = ?", sender.UserID).Scan(&username, &avatar)

	response, _ := json.Marshal(models.WSMessage{
		Type: "group_message",
		Payload: map[string]interface{}{
			"sender_id":  sender.UserID,
			"username":   username,
			"avatar":     avatar,
			"content":    content,
			"group_id":   groupID,
			"created_at": time.Now(),
		},
	})

	rows, err := h.DB.Query("SELECT user_id FROM group_members WHERE group_id = ? AND status = 'accepted' AND user_id != ?", groupID, sender.UserID)
	if err != nil {
		return
	}
	defer rows.Close()

	h.mu.RLock()
	defer h.mu.RUnlock()

	for rows.Next() {
		var uid int
		rows.Scan(&uid)
		if client, ok := h.clients[uid]; ok {
			select {
			case client.Send <- response:
			default:
			}
		}
	}

	sender.Send <- response
}

func (h *Hub) handleTyping(sender *Client, msg models.WSMessage) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		return
	}

	receiverID := int(payload["receiver_id"].(float64))

	response, _ := json.Marshal(models.WSMessage{
		Type: "typing",
		Payload: map[string]interface{}{
			"sender_id":   sender.UserID,
			"receiver_id": receiverID,
		},
	})

	h.mu.RLock()
	receiverClient, ok := h.clients[receiverID]
	h.mu.RUnlock()

	if ok {
		select {
		case receiverClient.Send <- response:
		default:
		}
	}
}

func (h *Hub) GetChatHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id")
	if userID == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	otherID := r.URL.Query().Get("user_id")
	var rows *sql.Rows
	var err error

	if otherID != "" {
		rows, err = h.DB.Query(`
			SELECT m.id, m.sender_id, m.receiver_id, m.group_id, m.content, m.created_at,
				u.first_name || ' ' || u.last_name, u.avatar
			FROM messages m
			JOIN users u ON m.sender_id = u.id
			WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
			ORDER BY m.created_at ASC
		`, userID, otherID, otherID, userID)
	} else {
		rows, err = h.DB.Query(`
			SELECT m.id, m.sender_id, m.receiver_id, m.group_id, m.content, m.created_at,
				u.first_name || ' ' || u.last_name, u.avatar
			FROM messages m
			JOIN users u ON m.sender_id = u.id
			WHERE m.sender_id = ? OR m.receiver_id = ?
			ORDER BY m.created_at DESC LIMIT 50
		`, userID, userID)
	}

	if err != nil {
		http.Error(w, "Failed to get messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.GroupID, &m.Content, &m.CreatedAt, &m.Username, &m.Avatar); err != nil {
			continue
		}
		messages = append(messages, m)
	}

	if messages == nil {
		messages = []models.Message{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

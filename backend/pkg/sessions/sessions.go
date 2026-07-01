package sessions

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID        string
	UserID    int
	ExpiresAt time.Time
}

func GenerateToken() (string, error) {
	return uuid.New().String(), nil
}

func CreateSession(db *sql.DB, userID int) (*Session, error) {
	token, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(24 * time.Hour)
	_, err = db.Exec(
		"INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
		token, userID, expiresAt,
	)
	if err != nil {
		return nil, err
	}

	return &Session{ID: token, UserID: userID, ExpiresAt: expiresAt}, nil
}

func GetSessionByToken(db *sql.DB, token string) (*Session, error) {
	row := db.QueryRow("SELECT id, user_id, expires_at FROM sessions WHERE id = ?", token)
	var s Session
	err := row.Scan(&s.ID, &s.UserID, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func GetSessionByUserID(db *sql.DB, userID int) (*Session, error) {
	row := db.QueryRow("SELECT id, user_id, expires_at FROM sessions WHERE user_id = ?", userID)
	var s Session
	err := row.Scan(&s.ID, &s.UserID, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func DeleteSession(db *sql.DB, token string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE id = ?", token)
	return err
}

func DeleteExpiredSessions(db *sql.DB) error {
	_, err := db.Exec("DELETE FROM sessions WHERE expires_at < ?", time.Now())
	return err
}

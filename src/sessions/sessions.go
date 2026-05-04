package sessions

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"time"
)

type Session struct {
	ID        string
	UserID    int
	ExpiresAt time.Time
}

func GenerateToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func CreateSession(db *sql.DB, query string, token string, userID int) (time.Time, error) {
	expiresAt := time.Now().Add(24 * time.Hour)
	_, err := db.Exec(query, token, userID, expiresAt)
	return expiresAt, err
}

func GetSessionByToken(db *sql.DB, query string, token string) (*Session, error) {
	row := db.QueryRow(query, token)

	var s Session
	err := row.Scan(&s.ID, &s.UserID, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

func GetSessionByUserID(db *sql.DB, query string, userID int) (*Session, error) {
	row := db.QueryRow(query, userID)

	var s Session
	err := row.Scan(&s.ID, &s.UserID, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

func DeleteSession(db *sql.DB, query string, token string) error {
	_, err := db.Exec(query, token)
	return err
}

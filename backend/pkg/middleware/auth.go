package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"forum/pkg/models"
	"forum/pkg/sessions"
)

type contextKey string

const UserKey contextKey = "user"

func GetCurrentUser(r *http.Request, db *sql.DB) *models.User {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return nil
	}

	sess, err := sessions.GetSessionByToken(db, cookie.Value)
	if err != nil {
		return nil
	}

	if sess.ExpiresAt.Before(time.Now()) {
		sessions.DeleteSession(db, cookie.Value)
		return nil
	}

	row := db.QueryRow(
		"SELECT id, email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_public, created_at FROM users WHERE id = ?",
		sess.UserID,
	)
	var u models.User
	err = row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FirstName, &u.LastName, &u.DateOfBirth, &u.Avatar, &u.Nickname, &u.AboutMe, &u.IsPublic, &u.CreatedAt)
	if err != nil {
		return nil
	}
	return &u
}

func AuthMiddleware(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := GetCurrentUser(r, db)
		if user == nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Error: "Unauthorized"})
			return
		}
		ctx := context.WithValue(r.Context(), UserKey, user)
		next(w, r.WithContext(ctx))
	}
}

func OptionalAuth(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := GetCurrentUser(r, db)
		ctx := context.WithValue(r.Context(), UserKey, user)
		next(w, r.WithContext(ctx))
	}
}

func UserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

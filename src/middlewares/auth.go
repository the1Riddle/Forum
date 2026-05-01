package middlewares

import (
	"database/sql"
	"forum/src/sessions"
	"net/http"
	"time"
	"forum/src/data"
)

func GetCurrentUser(r *http.Request, db *sql.DB, queries *data.Queries) *data.User {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return nil
	}
	sess, err := sessions.GetSessionByToken(db, queries.GetSessionByToken, cookie.Value)
	if err != nil {
		return nil
	}
	if sess.ExpiresAt.Before(time.Now()) {
		return nil
	}
	row := db.QueryRow(queries.GetUserByID, sess.UserID)
	var u data.User
	if err := row.Scan(&u.Id, &u.Email, &u.Username, &u.PasswordHash); err != nil {
		return nil
	}
	return &u
}

func RequireAuth(db *sql.DB, queries *data.Queries, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := GetCurrentUser(r, db, queries)
		if user == nil {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next(w, r)
	}
}

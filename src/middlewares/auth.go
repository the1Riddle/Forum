package middlewares

import (
	"database/sql"
	session "forum/src/sessions"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, _ := session.Store.Get(r, "user-session")

		name, ok := sess.Values["name"].(string)
		if !ok || name == "" {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		// FIXED: Use "sqlite3" instead of "sqlite"
		db, err := sql.Open("sqlite3", "./sqldbs/test.db")
		if err != nil {
			http.Error(w, "Database connection error", http.StatusInternalServerError)
			return
		}
		defer db.Close()

		// Verify user exists in database (optional but recommended)
		var userExists bool
		err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", name).Scan(&userExists)
		if err != nil || !userExists {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		next.ServeHTTP(w, r)
	})
}

package middlewares

import (
	"database/sql"
	"net/http"

	"forum/session"

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

		db, err := sql.Open("sqlite", "./sqldbs/test.db")
		if err != nil {
			panic(err)
		}
		defer db.Close()

		next.ServeHTTP(w, r)
	})
}

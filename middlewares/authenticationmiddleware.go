package middlewares

import (
	"log"
	"net/http"
	"forum/session"
)

func AuthMiddleware(next http.Handler) http.Handler {
	log.Println("Hello from Go log");
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

sess, _ := session.Store.Get(r, "user-session")

name, ok := sess.Values["name"].(string)

		if !ok || name == "" {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		// user is logged in → continue
		next.ServeHTTP(w, r)
	})
}


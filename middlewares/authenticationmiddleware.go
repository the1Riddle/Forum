package middlewares

import (
	"log"
	"net/http"
)


func AuthMiddleware(next http.Handler) http.Handler {
	log.Println("Hello from Go log");
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		session, _ := store.Get(r, "user-session")

		name, ok := session.Values["name"].(string)

		if !ok || name == "" {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		// user is logged in → continue
		next.ServeHTTP(w, r)
	})
}


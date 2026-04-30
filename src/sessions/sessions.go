package session

import (
	"net/http"
	"time"

	"github.com/gorilla/sessions"
)

var Store *sessions.CookieStore

func InitSessionStore() {
	// Use a strong secret key in production (environment variable recommended)
	secretKey := []byte("your-32-byte-secret-key-here-change-in-production")
	Store = sessions.NewCookieStore(secretKey)

	// Configure session options
	Store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400, // 24 hours
		HttpOnly: true,
		Secure:   false, // Set to true if using HTTPS
		SameSite: http.SameSiteLaxMode,
	}
}

// GetSession returns the session for the request
func GetSession(r *http.Request) (*sessions.Session, error) {
	return Store.Get(r, "forum-session")
}

// CreateUserSession creates a new session for a user
func CreateUserSession(w http.ResponseWriter, r *http.Request, userID int, username string) error {
	session, err := Store.Get(r, "forum-session")
	if err != nil {
		return err
	}

	session.Values["user_id"] = userID
	session.Values["username"] = username
	session.Values["authenticated"] = true
	session.Values["expires"] = time.Now().Add(24 * time.Hour)

	return session.Save(r, w)
}

// DestroySession destroys the user's session
func DestroySession(w http.ResponseWriter, r *http.Request) error {
	session, err := Store.Get(r, "forum-session")
	if err != nil {
		return err
	}

	// Clear session values
	session.Values = make(map[interface{}]interface{})
	session.Options.MaxAge = -1 // Delete cookie

	return session.Save(r, w)
}

// IsAuthenticated checks if user is logged in
func IsAuthenticated(r *http.Request) bool {
	session, err := Store.Get(r, "forum-session")
	if err != nil {
		return false
	}

	auth, ok := session.Values["authenticated"].(bool)
	if !ok || !auth {
		return false
	}

	// Check expiry
	expires, ok := session.Values["expires"].(time.Time)
	if ok && time.Now().After(expires) {
		return false
	}

	return true
}

// GetCurrentUser returns the current user ID and username
func GetCurrentUser(r *http.Request) (userID int, username string, ok bool) {
	session, err := Store.Get(r, "forum-session")
	if err != nil {
		return 0, "", false
	}

	userID, ok = session.Values["user_id"].(int)
	if !ok {
		return 0, "", false
	}

	username, ok = session.Values["username"].(string)
	return userID, username, ok
}

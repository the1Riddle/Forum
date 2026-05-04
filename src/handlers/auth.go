package handlers

/**
Even as you read this, not that this is not auth for authorisation, but for authentication.
This is the process of verifying the identity of a user, typically through a login system.
The code in this file will handle user registration, login, and logout functionality.

for authorisation, head to middlewares/auth.go

by whoever wrote this knows, ha.
*/

import (
	"database/sql"
	"net/http"
	"strings"
	"time"
	"log"

	"forum/src/data"
	"forum/src/middlewares"
	"forum/src/sessions"

	"golang.org/x/crypto/bcrypt"
)

/**
func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
	h.Tmpl.ExecuteTemplate(w, "home.html", map[string]interface{}{
		"User": h.currentUser(r),
	})
}
	**/

func (h *Handler) ShowRegister(w http.ResponseWriter, r *http.Request) {
	h.Tmpl.ExecuteTemplate(w, "register.html", map[string]interface{}{
		"Error": r.URL.Query().Get("error"),
	})
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/register", http.StatusSeeOther)
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	username := strings.TrimSpace(r.FormValue("username"))
	password := r.FormValue("password")

	if email == "" || username == "" || password == "" {
		http.Redirect(w, r, "/register?error=All+fields+are+required", http.StatusSeeOther)
		return
	}

	_, err := data.GetUserByEmail(h.DB, h.Queries.GetUserByEmail, email)
	if err == nil {
		http.Redirect(w, r, "/register?error=Email+already+registered", http.StatusSeeOther)
		return
	}
	if err != sql.ErrNoRows {
		log.Printf("ERROR: Failed to check user email: %v Status: %d", err, http.StatusInternalServerError)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("ERROR: Failed to hash password: %v Status: %d", err, http.StatusInternalServerError)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	if err := data.CreateUser(h.DB, h.Queries.CreatUser, email, username, string(hash)); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			log.Printf("ERROR: Username or email already taken: %v Status: %d", err, http.StatusConflict)
			http.Redirect(w, r, "/register?error=Username+or+email+already+taken", http.StatusSeeOther)
			return
		}
		log.Printf("ERROR: Failed to create user: %v Status: %d", err, http.StatusInternalServerError)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/login?msg=Registration+successful", http.StatusSeeOther)
}

func (h *Handler) ShowLogin(w http.ResponseWriter, r *http.Request) {
	h.Tmpl.ExecuteTemplate(w, "login.html", map[string]interface{}{
		"Error":   r.URL.Query().Get("error"),
		"Message": r.URL.Query().Get("msg"),
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var expiresAt time.Time
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")

	user, err := data.GetUserByEmail(h.DB, h.Queries.GetUserByEmail, email)
	if err != nil {
		http.Redirect(w, r, "/login?error=Invalid+email+or+password", http.StatusSeeOther)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		http.Redirect(w, r, "/login?error=Invalid+email+or+password", http.StatusSeeOther)
		return
	}

	session, err := sessions.GetSessionByUserID(h.DB, h.Queries.GetSessionByUserID, user.Id)
	if err == nil {
		if session.ExpiresAt.After(time.Now()) {
			log.Printf("ERROR: User already logged in another session UserID: %d Status: %d", user.Id, http.StatusConflict)
			http.Redirect(w, r, "/login?error=You+are+already+logged+in+another+session", http.StatusSeeOther)
			return
		}
	}

	token, err := sessions.GenerateToken()
	if err != nil {
		log.Printf("ERROR: Failed to generate session token: %v Status: %d", err, http.StatusInternalServerError)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	expiresAt, err = sessions.CreateSession(h.DB, h.Queries.CreatSession, token, user.Id)
	if err != nil {
		log.Printf("ERROR: Failed to create session: %v Status: %d", err, http.StatusInternalServerError)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Expires:  expiresAt,
		HttpOnly: true,
		Path:     "/",
	})

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err == nil {
		sessions.DeleteSession(h.DB, h.Queries.DeleteSessionByToken, cookie.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		MaxAge:   -1,
		HttpOnly: true,
		Path:     "/",
	})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (h *Handler) currentUser(r *http.Request) *data.User {
	return middlewares.GetCurrentUser(r, h.DB, h.Queries)
}

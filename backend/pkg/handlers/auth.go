package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"forum/pkg/middleware"
	"forum/pkg/models"
	"forum/pkg/sessions"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	var input struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		DateOfBirth string `json:"date_of_birth"`
		Avatar      string `json:"avatar"`
		Nickname    string `json:"nickname"`
		AboutMe     string `json:"about_me"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	input.Email = strings.TrimSpace(input.Email)
	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)

	if input.Email == "" || input.Password == "" || input.FirstName == "" || input.LastName == "" || input.DateOfBirth == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Email, password, first name, last name, and date of birth are required"})
		return
	}

	if len(input.Password) < 6 {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Password must be at least 6 characters"})
		return
	}

	var count int
	err := h.DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", input.Email).Scan(&count)
	if err == nil && count > 0 {
		middleware.JSON(w, http.StatusConflict, models.ErrorResponse{Error: "Email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to process password"})
		return
	}

	_, err = h.DB.Exec(
		"INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		input.Email, string(hash), input.FirstName, input.LastName, input.DateOfBirth, input.Avatar, input.Nickname, input.AboutMe,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			middleware.JSON(w, http.StatusConflict, models.ErrorResponse{Error: "Email already registered"})
			return
		}
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create user"})
		return
	}

	middleware.JSON(w, http.StatusCreated, models.SuccessResponse{Message: "Registration successful"})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	input.Email = strings.TrimSpace(input.Email)
	if input.Email == "" || input.Password == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Email and password are required"})
		return
	}

	var user models.User
	err := h.DB.QueryRow(
		"SELECT id, email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_public, created_at FROM users WHERE email = ?",
		input.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Avatar, &user.Nickname, &user.AboutMe, &user.IsPublic, &user.CreatedAt)
	if err != nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Invalid email or password"})
		return
	}

	existingSession, _ := sessions.GetSessionByUserID(h.DB, user.ID)
	if existingSession != nil {
		if existingSession.ExpiresAt.After(time.Now()) {
			sessions.DeleteSession(h.DB, existingSession.ID)
		}
	}

	sess, err := sessions.CreateSession(h.DB, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create session"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sess.ID,
		Expires:  sess.ExpiresAt,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{
		Message: "Login successful",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":         user.ID,
				"email":      user.Email,
				"first_name": user.FirstName,
				"last_name":  user.LastName,
				"avatar":     user.Avatar,
				"nickname":   user.Nickname,
			},
		},
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err == nil {
		sessions.DeleteSession(h.DB, cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		MaxAge:   -1,
		HttpOnly: true,
		Path:     "/",
	})

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Logged out successfully"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Not authenticated"})
		return
	}

	var followerCount, followingCount int
	h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE followee_id = ? AND status = 'accepted'", user.ID).Scan(&followerCount)
	h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'", user.ID).Scan(&followingCount)

	middleware.JSON(w, http.StatusOK, models.UserPublic{
		ID:             user.ID,
		Email:          user.Email,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		Avatar:         user.Avatar,
		Nickname:       user.Nickname,
		AboutMe:        user.AboutMe,
		IsPublic:       user.IsPublic,
		FollowerCount:  followerCount,
		FollowingCount: followingCount,
	})
}

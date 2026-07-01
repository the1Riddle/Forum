package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"forum/pkg/middleware"
	"forum/pkg/models"
)

type ProfileHandler struct {
	DB *sql.DB
}

func NewProfileHandler(db *sql.DB) *ProfileHandler {
	return &ProfileHandler{DB: db}
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.UserFromContext(r.Context())

	userIDStr := r.URL.Query().Get("id")
	if userIDStr == "" && currentUser == nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "User ID required"})
		return
	}

	var profileID int
	if userIDStr != "" {
		var err error
		profileID, err = strconv.Atoi(userIDStr)
		if err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid user ID"})
			return
		}
	} else {
		profileID = currentUser.ID
	}

	var user models.User
	err := h.DB.QueryRow(
		"SELECT id, email, password_hash, first_name, last_name, date_of_birth, avatar, nickname, about_me, is_public, created_at FROM users WHERE id = ?",
		profileID,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName, &user.DateOfBirth, &user.Avatar, &user.Nickname, &user.AboutMe, &user.IsPublic, &user.CreatedAt)
	if err != nil {
		middleware.JSON(w, http.StatusNotFound, models.ErrorResponse{Error: "User not found"})
		return
	}

	var followerCount, followingCount, postCount int
	h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE followee_id = ? AND status = 'accepted'", user.ID).Scan(&followerCount)
	h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'", user.ID).Scan(&followingCount)
	h.DB.QueryRow("SELECT COUNT(*) FROM posts WHERE user_id = ?", user.ID).Scan(&postCount)

	publicProfile := models.UserPublic{
		ID:             user.ID,
		Email:          user.Email,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		Avatar:         user.Avatar,
		Nickname:       user.Nickname,
		AboutMe:        user.AboutMe,
		IsPublic:       user.IsPublic,
		FollowersCount: followerCount,
		FollowingCount: followingCount,
		PostCount:      postCount,
	}

	isOwner := currentUser != nil && currentUser.ID == user.ID
	isFollower := false

	if currentUser != nil && !isOwner {
		var count int
		h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'", currentUser.ID, user.ID).Scan(&count)
		isFollower = count > 0
	}

	canViewDetails := isOwner || user.IsPublic || isFollower

	var followStatus string
	if currentUser != nil && !isOwner {
		var status string
		err := h.DB.QueryRow("SELECT status FROM followers WHERE follower_id = ? AND followee_id = ?", currentUser.ID, user.ID).Scan(&status)
		if err == nil {
			followStatus = status
		}
	}

	if !canViewDetails {
		middleware.JSON(w, http.StatusOK, map[string]interface{}{
			"profile":       publicProfile,
			"is_owner":      isOwner,
			"is_follower":   false,
			"follow_status": followStatus,
			"private":       true,
		})
		return
	}

	posts, _ := h.getUserPosts(user.ID)

	var followers, following []models.Follower
	if isOwner || isFollower || user.IsPublic {
		followers, _ = h.getFollowers(user.ID)
		following, _ = h.getFollowing(user.ID)
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"profile":       publicProfile,
		"is_owner":      isOwner,
		"is_follower":   isFollower,
		"follow_status": followStatus,
		"posts":         posts,
		"followers":     followers,
		"following":     following,
	})
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Avatar    string `json:"avatar"`
		Nickname  string `json:"nickname"`
		AboutMe   string `json:"about_me"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	_, err := h.DB.Exec(
		"UPDATE users SET first_name = ?, last_name = ?, avatar = ?, nickname = ?, about_me = ? WHERE id = ?",
		strings.TrimSpace(input.FirstName),
		strings.TrimSpace(input.LastName),
		input.Avatar,
		input.Nickname,
		input.AboutMe,
		user.ID,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update profile"})
		return
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Profile updated"})
}

func (h *ProfileHandler) TogglePrivacy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		IsPublic bool `json:"is_public"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	_, err := h.DB.Exec("UPDATE users SET is_public = ? WHERE id = ?", input.IsPublic, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update privacy"})
		return
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Privacy updated"})
}

func (h *ProfileHandler) getUserPosts(userID int) ([]models.Post, error) {
	rows, err := h.DB.Query(`
		SELECT p.id, p.user_id, p.title, p.content, p.image, p.privacy, p.created_at,
			u.first_name || ' ' || u.last_name, u.avatar,
			COALESCE(l.likes, 0), COALESCE(d.dislikes, 0),
			COALESCE(c.comment_count, 0)
		FROM posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN (SELECT post_id, COUNT(*) as likes FROM reactions WHERE type = 'like' AND post_id IS NOT NULL GROUP BY post_id) l ON p.id = l.post_id
		LEFT JOIN (SELECT post_id, COUNT(*) as dislikes FROM reactions WHERE type = 'dislike' AND post_id IS NOT NULL GROUP BY post_id) d ON p.id = d.post_id
		LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
		WHERE p.user_id = ?
		ORDER BY p.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.Privacy, &p.CreatedAt, &p.Username, &p.Avatar, &p.Likes, &p.Dislikes, &p.CommentCount); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, nil
}

func (h *ProfileHandler) getFollowers(userID int) ([]models.Follower, error) {
	rows, err := h.DB.Query(`
		SELECT f.id, f.follower_id, f.followee_id, f.status, f.created_at,
			u.first_name || ' ' || u.last_name, u.avatar, u.first_name, u.last_name
		FROM followers f
		JOIN users u ON f.follower_id = u.id
		WHERE f.followee_id = ? AND f.status = 'accepted'
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanFollowers(rows)
}

func (h *ProfileHandler) getFollowing(userID int) ([]models.Follower, error) {
	rows, err := h.DB.Query(`
		SELECT f.id, f.follower_id, f.followee_id, f.status, f.created_at,
			u.first_name || ' ' || u.last_name, u.avatar, u.first_name, u.last_name
		FROM followers f
		JOIN users u ON f.followee_id = u.id
		WHERE f.follower_id = ? AND f.status = 'accepted'
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanFollowers(rows)
}

func scanFollowers(rows *sql.Rows) ([]models.Follower, error) {
	var followers []models.Follower
	for rows.Next() {
		var f models.Follower
		if err := rows.Scan(&f.ID, &f.FollowerID, &f.FolloweeID, &f.Status, &f.CreatedAt, &f.Username, &f.Avatar, &f.FirstName, &f.LastName); err != nil {
			return nil, err
		}
		followers = append(followers, f)
	}
	return followers, rows.Err()
}

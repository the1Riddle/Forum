package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"forum/pkg/middleware"
	"forum/pkg/models"
)

type FollowerHandler struct {
	DB *sql.DB
}

func NewFollowerHandler(db *sql.DB) *FollowerHandler {
	return &FollowerHandler{DB: db}
}

func (h *FollowerHandler) FollowRequest(w http.ResponseWriter, r *http.Request) {
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
		FolloweeID int `json:"followee_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	if user.ID == input.FolloweeID {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Cannot follow yourself"})
		return
	}

	var isPublic bool
	err := h.DB.QueryRow("SELECT is_public FROM users WHERE id = ?", input.FolloweeID).Scan(&isPublic)
	if err != nil {
		middleware.JSON(w, http.StatusNotFound, models.ErrorResponse{Error: "User not found"})
		return
	}

	var existing int
	h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followee_id = ?", user.ID, input.FolloweeID).Scan(&existing)
	if existing > 0 {
		middleware.JSON(w, http.StatusConflict, models.ErrorResponse{Error: "Follow request already exists"})
		return
	}

	status := "accepted"
	if !isPublic {
		status = "pending"
	}

	_, err = h.DB.Exec(
		"INSERT INTO followers (follower_id, followee_id, status) VALUES (?, ?, ?)",
		user.ID, input.FolloweeID, status,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to send follow request"})
		return
	}

	if !isPublic {
		h.DB.Exec(
			"INSERT INTO notifications (user_id, from_user_id, type, content) VALUES (?, ?, 'follow_request', ?)",
			input.FolloweeID, user.ID, user.FirstName+" "+user.LastName+" wants to follow you",
		)
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Follow request sent"})
}

func (h *FollowerHandler) AcceptFollow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	followerIDStr := r.URL.Query().Get("follower_id")
	followerID, err := strconv.Atoi(followerIDStr)
	if err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid follower ID"})
		return
	}

	_, err = h.DB.Exec("UPDATE followers SET status = 'accepted' WHERE follower_id = ? AND followee_id = ? AND status = 'pending'", followerID, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to accept follow request"})
		return
	}

	h.DB.Exec("DELETE FROM notifications WHERE user_id = ? AND from_user_id = ? AND type = 'follow_request'", user.ID, followerID)
	h.DB.Exec(
		"INSERT INTO notifications (user_id, from_user_id, type, content) VALUES (?, ?, 'follow_accepted', ?)",
		followerID, user.ID, user.FirstName+" "+user.LastName+" accepted your follow request",
	)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Follow request accepted"})
}

func (h *FollowerHandler) DeclineFollow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	followerIDStr := r.URL.Query().Get("follower_id")
	followerID, err := strconv.Atoi(followerIDStr)
	if err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid follower ID"})
		return
	}

	h.DB.Exec("DELETE FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'pending'", followerID, user.ID)
	h.DB.Exec("DELETE FROM notifications WHERE user_id = ? AND from_user_id = ? AND type = 'follow_request'", user.ID, followerID)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Follow request declined"})
}

func (h *FollowerHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
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
		FolloweeID int `json:"followee_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	_, err := h.DB.Exec("DELETE FROM followers WHERE follower_id = ? AND followee_id = ?", user.ID, input.FolloweeID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to unfollow"})
		return
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Unfollowed successfully"})
}

func (h *FollowerHandler) GetPendingRequests(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT f.follower_id as id, f.follower_id, f.followee_id, f.status, f.created_at,
			u.first_name || ' ' || u.last_name, u.avatar, u.first_name, u.last_name
		FROM followers f
		JOIN users u ON f.follower_id = u.id
		WHERE f.followee_id = ? AND f.status = 'pending'
	`, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get requests"})
		return
	}
	defer rows.Close()

	followers, _ := scanFollowers(rows)
	middleware.JSON(w, http.StatusOK, followers)
}

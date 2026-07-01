package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"forum/pkg/middleware"
	"forum/pkg/models"
)

type ReactionHandler struct {
	DB *sql.DB
}

func NewReactionHandler(db *sql.DB) *ReactionHandler {
	return &ReactionHandler{DB: db}
}

func (h *ReactionHandler) React(w http.ResponseWriter, r *http.Request) {
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
		TargetType string `json:"target_type"`
		TargetID   int    `json:"target_id"`
		Reaction   string `json:"reaction"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	if input.Reaction != "like" && input.Reaction != "dislike" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Reaction must be 'like' or 'dislike'"})
		return
	}

	switch input.TargetType {
	case "post":
		targetID := input.TargetID
		err := h.toggleReaction(user.ID, &targetID, nil, input.Reaction)
		if err != nil {
			middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to react"})
			return
		}
	case "comment":
		targetID := input.TargetID
		err := h.toggleReaction(user.ID, nil, &targetID, input.Reaction)
		if err != nil {
			middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to react"})
			return
		}
	default:
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Target type must be 'post' or 'comment'"})
		return
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Reaction updated"})
}

func (h *ReactionHandler) toggleReaction(userID int, postID *int, commentID *int, reactionType string) error {
	var existingType string
	var err error

	if postID != nil {
		err = h.DB.QueryRow("SELECT type FROM reactions WHERE user_id = ? AND post_id = ? AND comment_id IS NULL", userID, *postID).Scan(&existingType)
	} else {
		err = h.DB.QueryRow("SELECT type FROM reactions WHERE user_id = ? AND comment_id = ? AND post_id IS NULL", userID, *commentID).Scan(&existingType)
	}

	if err == nil {
		if postID != nil {
			h.DB.Exec("DELETE FROM reactions WHERE user_id = ? AND post_id = ? AND comment_id IS NULL", userID, *postID)
		} else {
			h.DB.Exec("DELETE FROM reactions WHERE user_id = ? AND comment_id = ? AND post_id IS NULL", userID, *commentID)
		}
		if existingType == reactionType {
			return nil
		}
	}

	if postID != nil {
		_, err = h.DB.Exec("INSERT INTO reactions (user_id, post_id, type) VALUES (?, ?, ?)", userID, *postID, reactionType)
	} else {
		_, err = h.DB.Exec("INSERT INTO reactions (user_id, comment_id, type) VALUES (?, ?, ?)", userID, *commentID, reactionType)
	}
	return err
}

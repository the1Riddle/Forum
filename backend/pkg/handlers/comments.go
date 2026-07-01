package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"forum/pkg/middleware"
	"forum/pkg/models"
)

type CommentHandler struct {
	DB *sql.DB
}

func NewCommentHandler(db *sql.DB) *CommentHandler {
	return &CommentHandler{DB: db}
}

func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	contentType := r.Header.Get("Content-Type")
	var postID int
	var content, imagePath string

	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Failed to parse form"})
			return
		}

		postIDStr := r.FormValue("post_id")
		var err error
		postID, err = strconv.Atoi(postIDStr)
		if err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid post ID"})
			return
		}
		content = strings.TrimSpace(r.FormValue("content"))

		file, header, err := r.FormFile("image")
		if err == nil {
			defer file.Close()
			ext := strings.ToLower(filepath.Ext(header.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
				middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Only JPEG, PNG, and GIF images are allowed"})
				return
			}
			fileName := fmt.Sprintf("comment_%d_%d%s", user.ID, time.Now().UnixNano(), ext)
			uploadPath := filepath.Join("uploads", fileName)
			dst, err := os.Create(uploadPath)
			if err != nil {
				middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to save image"})
				return
			}
			defer dst.Close()
			if _, err := io.Copy(dst, file); err != nil {
				middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to save image"})
				return
			}
			imagePath = "/uploads/" + fileName
		}
	} else {
		var input struct {
			PostID  int    `json:"post_id"`
			Content string `json:"content"`
			Image   string `json:"image"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
			return
		}
		postID = input.PostID
		content = strings.TrimSpace(input.Content)
		imagePath = input.Image
	}

	if content == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Content is required"})
		return
	}

	var exists int
	h.DB.QueryRow("SELECT COUNT(*) FROM posts WHERE id = ?", postID).Scan(&exists)
	if exists == 0 {
		middleware.JSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Post not found"})
		return
	}

	_, err := h.DB.Exec(
		"INSERT INTO comments (user_id, post_id, content, image) VALUES (?, ?, ?, ?)",
		user.ID, postID, content, imagePath,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to add comment"})
		return
	}

	middleware.JSON(w, http.StatusCreated, models.SuccessResponse{Message: "Comment added"})
}

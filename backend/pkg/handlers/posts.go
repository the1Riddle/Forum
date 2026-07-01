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

type PostHandler struct {
	DB *sql.DB
}

func NewPostHandler(db *sql.DB) *PostHandler {
	return &PostHandler{DB: db}
}

func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
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

	var title, content, privacy string
	var allowedUsers []int
	var imagePath string

	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Failed to parse form"})
			return
		}
		title = strings.TrimSpace(r.FormValue("title"))
		content = strings.TrimSpace(r.FormValue("content"))
		privacy = r.FormValue("privacy")
		if privacy == "" {
			privacy = "public"
		}

		allowedStr := r.FormValue("allowed_users")
		if allowedStr != "" {
			for _, s := range strings.Split(allowedStr, ",") {
				id, err := strconv.Atoi(strings.TrimSpace(s))
				if err == nil {
					allowedUsers = append(allowedUsers, id)
				}
			}
		}

		file, header, err := r.FormFile("image")
		if err == nil {
			defer file.Close()
			ext := strings.ToLower(filepath.Ext(header.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
				middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Only JPEG, PNG, and GIF images are allowed"})
				return
			}

			fileName := fmt.Sprintf("%d_%d%s", user.ID, time.Now().UnixNano(), ext)
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
			Title        string `json:"title"`
			Content      string `json:"content"`
			Privacy      string `json:"privacy"`
			Image        string `json:"image"`
			AllowedUsers []int  `json:"allowed_users"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
			return
		}
		title = strings.TrimSpace(input.Title)
		content = strings.TrimSpace(input.Content)
		privacy = input.Privacy
		if privacy == "" {
			privacy = "public"
		}
		imagePath = input.Image
		allowedUsers = input.AllowedUsers
	}

	if title == "" || content == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Title and content are required"})
		return
	}

	if privacy != "public" && privacy != "almost_private" && privacy != "private" {
		privacy = "public"
	}

	if privacy == "private" && len(allowedUsers) == 0 {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Private posts must specify allowed users"})
		return
	}

	res, err := h.DB.Exec(
		"INSERT INTO posts (user_id, title, content, image, privacy) VALUES (?, ?, ?, ?, ?)",
		user.ID, title, content, imagePath, privacy,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create post"})
		return
	}

	postID, _ := res.LastInsertId()

	if privacy == "private" {
		for _, uid := range allowedUsers {
			h.DB.Exec("INSERT INTO post_privacy_users (post_id, user_id) VALUES (?, ?)", postID, uid)
		}
	}

	middleware.JSON(w, http.StatusCreated, models.SuccessResponse{
		Message: "Post created",
		Data:    map[string]int64{"id": postID},
	})
}

func (h *PostHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	filter := r.URL.Query().Get("filter")
	userIDStr := r.URL.Query().Get("user_id")

	var posts []models.Post
	var err error

	switch {
	case userIDStr != "":
		var uid int
		uid, err = strconv.Atoi(userIDStr)
		if err == nil {
			posts, err = h.getPostsByUser(uid)
		}
	case filter == "my" && user != nil:
		posts, err = h.getPostsByUser(user.ID)
	default:
		posts, err = h.getAllPosts(user)
	}

	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get posts"})
		return
	}

	if posts == nil {
		posts = []models.Post{}
	}

	middleware.JSON(w, http.StatusOK, posts)
}

func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	idStr := r.URL.Query().Get("id")

	postID, err := strconv.Atoi(idStr)
	if err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid post ID"})
		return
	}

	post, err := h.getPostByID(postID)
	if err != nil {
		middleware.JSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Post not found"})
		return
	}

	if !h.canViewPost(user, post) {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "You don't have permission to view this post"})
		return
	}

	comments, _ := h.getPostComments(postID)
	if comments == nil {
		comments = []models.Comment{}
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"post":     post,
		"comments": comments,
	})
}

func (h *PostHandler) canViewPost(user *models.User, post models.Post) bool {
	if post.Privacy == "public" {
		return true
	}
	if user == nil {
		return false
	}
	if post.UserID == user.ID {
		return true
	}
	if post.Privacy == "almost_private" {
		var count int
		h.DB.QueryRow("SELECT COUNT(*) FROM followers WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'", user.ID, post.UserID).Scan(&count)
		return count > 0
	}
	if post.Privacy == "private" {
		var count int
		h.DB.QueryRow("SELECT COUNT(*) FROM post_privacy_users WHERE post_id = ? AND user_id = ?", post.ID, user.ID).Scan(&count)
		return count > 0
	}
	return false
}

func (h *PostHandler) getAllPosts(user *models.User) ([]models.Post, error) {
	query := `
		SELECT p.id, p.user_id, u.first_name, u.last_name, COALESCE(u.nickname, ''), p.title, p.content, p.image, p.privacy, p.created_at,
			u.avatar,
			COALESCE(l.likes, 0), COALESCE(d.dislikes, 0),
			COALESCE(c.comment_count, 0)
		FROM posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN (SELECT post_id, COUNT(*) as likes FROM reactions WHERE type = 'like' AND post_id IS NOT NULL GROUP BY post_id) l ON p.id = l.post_id
		LEFT JOIN (SELECT post_id, COUNT(*) as dislikes FROM reactions WHERE type = 'dislike' AND post_id IS NOT NULL GROUP BY post_id) d ON p.id = d.post_id
		LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
	`

	var rows *sql.Rows
	var err error

	if user != nil {
		query += ` WHERE (
			p.privacy = 'public'
			OR p.user_id = ?
			OR (p.privacy = 'almost_private' AND EXISTS (SELECT 1 FROM followers WHERE follower_id = ? AND followee_id = p.user_id AND status = 'accepted'))
			OR (p.privacy = 'private' AND EXISTS (SELECT 1 FROM post_privacy_users WHERE post_id = p.id AND user_id = ?))
		) ORDER BY p.created_at DESC`
		rows, err = h.DB.Query(query, user.ID, user.ID, user.ID)
	} else {
		query += " WHERE p.privacy = 'public' ORDER BY p.created_at DESC"
		rows, err = h.DB.Query(query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanPosts(rows)
}

func (h *PostHandler) getPostsByUser(userID int) ([]models.Post, error) {
	rows, err := h.DB.Query(`
		SELECT p.id, p.user_id, u.first_name, u.last_name, COALESCE(u.nickname, ''), p.title, p.content, p.image, p.privacy, p.created_at,
			u.avatar,
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

	return scanPosts(rows)
}

func (h *PostHandler) getPostByID(postID int) (models.Post, error) {
	row := h.DB.QueryRow(`
		SELECT p.id, p.user_id, u.first_name, u.last_name, COALESCE(u.nickname, ''), p.title, p.content, p.image, p.privacy, p.created_at,
			u.avatar,
			COALESCE(l.likes, 0), COALESCE(d.dislikes, 0),
			COALESCE(c.comment_count, 0)
		FROM posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN (SELECT post_id, COUNT(*) as likes FROM reactions WHERE type = 'like' AND post_id IS NOT NULL GROUP BY post_id) l ON p.id = l.post_id
		LEFT JOIN (SELECT post_id, COUNT(*) as dislikes FROM reactions WHERE type = 'dislike' AND post_id IS NOT NULL GROUP BY post_id) d ON p.id = d.post_id
		LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
		WHERE p.id = ?
	`, postID)
	var p models.Post
	err := row.Scan(&p.ID, &p.UserID, &p.FirstName, &p.LastName, &p.Nickname, &p.Title, &p.Content, &p.Image, &p.Privacy, &p.CreatedAt, &p.Avatar, &p.LikesCount, &p.DislikesCount, &p.CommentsCount)
	return p, err
}

func (h *PostHandler) getPostComments(postID int) ([]models.Comment, error) {
	rows, err := h.DB.Query(`
		SELECT c.id, c.user_id, c.post_id, c.content, c.image, c.created_at,
			u.first_name || ' ' || u.last_name, u.avatar,
			COALESCE(l.likes, 0), COALESCE(d.dislikes, 0)
		FROM comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN (SELECT comment_id, COUNT(*) as likes FROM reactions WHERE type = 'like' AND comment_id IS NOT NULL GROUP BY comment_id) l ON c.id = l.comment_id
		LEFT JOIN (SELECT comment_id, COUNT(*) as dislikes FROM reactions WHERE type = 'dislike' AND comment_id IS NOT NULL GROUP BY comment_id) d ON c.id = d.comment_id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.UserID, &c.PostID, &c.Content, &c.Image, &c.CreatedAt, &c.Username, &c.Avatar, &c.Likes, &c.Dislikes); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func scanPosts(rows *sql.Rows) ([]models.Post, error) {
	var posts []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(&p.ID, &p.UserID, &p.FirstName, &p.LastName, &p.Nickname, &p.Title, &p.Content, &p.Image, &p.Privacy, &p.CreatedAt, &p.Avatar, &p.LikesCount, &p.DislikesCount, &p.CommentsCount); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"forum/pkg/middleware"
	"forum/pkg/models"
)

type NotificationHandler struct {
	DB *sql.DB
}

func NewNotificationHandler(db *sql.DB) *NotificationHandler {
	return &NotificationHandler{DB: db}
}

func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT n.id, n.user_id, n.from_user_id, n.type, n.group_id, n.content, n.is_read, n.created_at,
			COALESCE(u.first_name || ' ' || u.last_name, ''),
			COALESCE(g.title, '')
		FROM notifications n
		LEFT JOIN users u ON n.from_user_id = u.id
		LEFT JOIN groups_ g ON n.group_id = g.id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
		LIMIT 50
	`, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get notifications"})
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.FromUserID, &n.Type, &n.GroupID, &n.Content, &n.IsRead, &n.CreatedAt, &n.FromName, &n.GroupTitle); err != nil {
			continue
		}
		notifications = append(notifications, n)
	}

	if notifications == nil {
		notifications = []models.Notification{}
	}

	middleware.JSON(w, http.StatusOK, notifications)
}

func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		middleware.JSON(w, http.StatusMethodNotAllowed, models.ErrorResponse{Error: "Method not allowed"})
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "all" {
		_, err := h.DB.Exec("UPDATE notifications SET is_read = 1 WHERE user_id = ?", user.ID)
		if err != nil {
			middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to mark notifications as read"})
			return
		}
		middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "All notifications marked as read"})
		return
	}

	notifID, err := strconv.Atoi(idStr)
	if err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid notification ID"})
		return
	}

	_, err = h.DB.Exec("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", notifID, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to mark notification as read"})
		return
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Notification marked as read"})
}

func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var count int
	h.DB.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", user.ID).Scan(&count)

	middleware.JSON(w, http.StatusOK, map[string]int{"unread_count": count})
}

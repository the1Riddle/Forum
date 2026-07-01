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

type GroupHandler struct {
	DB *sql.DB
}

func NewGroupHandler(db *sql.DB) *GroupHandler {
	return &GroupHandler{DB: db}
}

func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
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
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Title is required"})
		return
	}

	res, err := h.DB.Exec(
		"INSERT INTO groups_ (title, description, creator_id) VALUES (?, ?, ?)",
		input.Title, input.Description, user.ID,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create group"})
		return
	}

	groupID, _ := res.LastInsertId()

	h.DB.Exec(
		"INSERT INTO group_members (group_id, user_id, status, role) VALUES (?, ?, 'accepted', 'creator')",
		groupID, user.ID,
	)

	middleware.JSON(w, http.StatusCreated, models.SuccessResponse{
		Message: "Group created",
		Data:    map[string]int64{"id": groupID},
	})
}

func (h *GroupHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	rows, err := h.DB.Query(`
		SELECT g.id, g.title, g.description, g.creator_id, g.created_at,
			(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'accepted') as member_count
		FROM groups_ g
		ORDER BY g.created_at DESC
	`)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get groups"})
		return
	}
	defer rows.Close()

	var groups []models.Group
	for rows.Next() {
		var g models.Group
		if err := rows.Scan(&g.ID, &g.Title, &g.Description, &g.CreatorID, &g.CreatedAt, &g.MemberCount); err != nil {
			continue
		}
		if user != nil {
			var role string
			err := h.DB.QueryRow("SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", g.ID, user.ID).Scan(&role)
			if err == nil {
				g.Role = role
			}
		}
		groups = append(groups, g)
	}

	if groups == nil {
		groups = []models.Group{}
	}

	middleware.JSON(w, http.StatusOK, groups)
}

func (h *GroupHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	idStr := r.URL.Query().Get("id")

	groupID, err := strconv.Atoi(idStr)
	if err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid group ID"})
		return
	}

	var g models.Group
	err = h.DB.QueryRow(`
		SELECT g.id, g.title, g.description, g.creator_id, g.created_at,
			(SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'accepted') as member_count
		FROM groups_ g WHERE g.id = ?
	`, groupID).Scan(&g.ID, &g.Title, &g.Description, &g.CreatorID, &g.CreatedAt, &g.MemberCount)
	if err != nil {
		middleware.JSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Group not found"})
		return
	}

	isMember := false
	var role string
	if user != nil {
		err := h.DB.QueryRow("SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", groupID, user.ID).Scan(&role)
		if err == nil {
			isMember = true
			g.Role = role
		}
	}

	members, _ := h.getGroupMembers(groupID)
	posts, _ := h.getGroupPosts(groupID)
	events, _ := h.getGroupEvents(groupID)

	if members == nil {
		members = []models.GroupMember{}
	}
	if posts == nil {
		posts = []models.GroupPost{}
	}
	if events == nil {
		events = []models.GroupEvent{}
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"group":    g,
		"is_member": isMember,
		"members":  members,
		"posts":    posts,
		"events":   events,
	})
}

func (h *GroupHandler) InviteMember(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		GroupID int `json:"group_id"`
		UserID  int `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	var role string
	err := h.DB.QueryRow("SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", input.GroupID, user.ID).Scan(&role)
	if err != nil {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "You are not a member of this group"})
		return
	}

	var exists int
	h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", input.GroupID, input.UserID).Scan(&exists)
	if exists > 0 {
		middleware.JSON(w, http.StatusConflict, models.ErrorResponse{Error: "User already invited or member"})
		return
	}

	_, err = h.DB.Exec(
		"INSERT INTO group_members (group_id, user_id, status, role) VALUES (?, ?, 'pending', 'member')",
		input.GroupID, input.UserID,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to invite user"})
		return
	}

	var groupTitle string
	h.DB.QueryRow("SELECT title FROM groups_ WHERE id = ?", input.GroupID).Scan(&groupTitle)
	h.DB.Exec(
		"INSERT INTO notifications (user_id, from_user_id, type, group_id, content) VALUES (?, ?, 'group_invite', ?, ?)",
		input.UserID, user.ID, input.GroupID, "You have been invited to join "+groupTitle,
	)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Invitation sent"})
}

func (h *GroupHandler) JoinRequest(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	var exists int
	h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", input.GroupID, user.ID).Scan(&exists)
	if exists > 0 {
		middleware.JSON(w, http.StatusConflict, models.ErrorResponse{Error: "Already a member or pending"})
		return
	}

	_, err := h.DB.Exec(
		"INSERT INTO group_members (group_id, user_id, status, role) VALUES (?, ?, 'pending', 'member')",
		input.GroupID, user.ID,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to send join request"})
		return
	}

	var groupTitle string
	var creatorID int
	h.DB.QueryRow("SELECT title, creator_id FROM groups_ WHERE id = ?", input.GroupID).Scan(&groupTitle, &creatorID)
	h.DB.Exec(
		"INSERT INTO notifications (user_id, from_user_id, type, group_id, content) VALUES (?, ?, 'group_join_request', ?, ?)",
		creatorID, user.ID, input.GroupID, user.FirstName+" "+user.LastName+" wants to join "+groupTitle,
	)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Join request sent"})
}

func (h *GroupHandler) AcceptJoin(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	groupIDStr := r.URL.Query().Get("group_id")
	userIDStr := r.URL.Query().Get("user_id")

	groupID, _ := strconv.Atoi(groupIDStr)
	joinUserID, _ := strconv.Atoi(userIDStr)

	var role string
	err := h.DB.QueryRow("SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", groupID, user.ID).Scan(&role)
	if err != nil || role != "creator" {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "Only the group creator can accept join requests"})
		return
	}

	_, err = h.DB.Exec("UPDATE group_members SET status = 'accepted' WHERE group_id = ? AND user_id = ? AND status = 'pending'", groupID, joinUserID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to accept join request"})
		return
	}

	h.DB.Exec("DELETE FROM notifications WHERE user_id = ? AND from_user_id = ? AND group_id = ? AND type = 'group_join_request'", user.ID, joinUserID, groupID)

	var groupTitle string
	h.DB.QueryRow("SELECT title FROM groups_ WHERE id = ?", groupID).Scan(&groupTitle)
	h.DB.Exec(
		"INSERT INTO notifications (user_id, type, group_id, content) VALUES (?, 'group_join_accepted', ?, ?)",
		joinUserID, groupID, "Your request to join "+groupTitle+" was accepted",
	)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Join request accepted"})
}

func (h *GroupHandler) DeclineJoin(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	groupIDStr := r.URL.Query().Get("group_id")
	userIDStr := r.URL.Query().Get("user_id")

	groupID, _ := strconv.Atoi(groupIDStr)
	joinUserID, _ := strconv.Atoi(userIDStr)

	var role string
	err := h.DB.QueryRow("SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", groupID, user.ID).Scan(&role)
	if err != nil || role != "creator" {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "Only the group creator can decline join requests"})
		return
	}

	h.DB.Exec("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending'", groupID, joinUserID)
	h.DB.Exec("DELETE FROM notifications WHERE user_id = ? AND from_user_id = ? AND group_id = ? AND type = 'group_join_request'", user.ID, joinUserID, groupID)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Join request declined"})
}

func (h *GroupHandler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	_, err := h.DB.Exec("UPDATE group_members SET status = 'accepted' WHERE group_id = ? AND user_id = ? AND status = 'pending'", input.GroupID, user.ID)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to accept invitation"})
		return
	}

	h.DB.Exec("DELETE FROM notifications WHERE user_id = ? AND group_id = ? AND type = 'group_invite'", user.ID, input.GroupID)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Invitation accepted"})
}

func (h *GroupHandler) DeclineInvite(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	h.DB.Exec("DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending'", input.GroupID, user.ID)
	h.DB.Exec("DELETE FROM notifications WHERE user_id = ? AND group_id = ? AND type = 'group_invite'", user.ID, input.GroupID)

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Invitation declined"})
}

func (h *GroupHandler) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	contentType := r.Header.Get("Content-Type")
	var groupID int
	var title, content, imagePath string

	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Failed to parse form"})
			return
		}
		groupID, _ = strconv.Atoi(r.FormValue("group_id"))
		title = strings.TrimSpace(r.FormValue("title"))
		content = strings.TrimSpace(r.FormValue("content"))

		file, header, err := r.FormFile("image")
		if err == nil {
			defer file.Close()
			ext := strings.ToLower(filepath.Ext(header.Filename))
			if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" {
				fileName := fmt.Sprintf("gpost_%d_%d%s", user.ID, time.Now().UnixNano(), ext)
				uploadPath := filepath.Join("uploads", fileName)
				dst, _ := os.Create(uploadPath)
				if dst != nil {
					io.Copy(dst, file)
					dst.Close()
					imagePath = "/uploads/" + fileName
				}
			}
		}
	} else {
		var input struct {
			GroupID int    `json:"group_id"`
			Title   string `json:"title"`
			Content string `json:"content"`
			Image   string `json:"image"`
		}
		json.NewDecoder(r.Body).Decode(&input)
		groupID = input.GroupID
		title = strings.TrimSpace(input.Title)
		content = strings.TrimSpace(input.Content)
		imagePath = input.Image
	}

	if title == "" || content == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Title and content are required"})
		return
	}

	var isMember int
	h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", groupID, user.ID).Scan(&isMember)
	if isMember == 0 {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "You are not a member of this group"})
		return
	}

	_, err := h.DB.Exec(
		"INSERT INTO group_posts (group_id, user_id, title, content, image) VALUES (?, ?, ?, ?, ?)",
		groupID, user.ID, title, content, imagePath,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create post"})
		return
	}

	middleware.JSON(w, http.StatusCreated, models.SuccessResponse{Message: "Group post created"})
}

func (h *GroupHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		GroupID     int    `json:"group_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		EventTime   string `json:"event_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" || input.EventTime == "" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Title and event time are required"})
		return
	}

	eventTime, err := time.Parse(time.RFC3339, input.EventTime)
	if err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid event time format (use RFC3339)"})
		return
	}

	var isMember int
	h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", input.GroupID, user.ID).Scan(&isMember)
	if isMember == 0 {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "You are not a member of this group"})
		return
	}

	_, err = h.DB.Exec(
		"INSERT INTO group_events (group_id, creator_id, title, description, event_time) VALUES (?, ?, ?, ?, ?)",
		input.GroupID, user.ID, input.Title, input.Description, eventTime,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create event"})
		return
	}

	var groupTitle string
	h.DB.QueryRow("SELECT title FROM groups_ WHERE id = ?", input.GroupID).Scan(&groupTitle)

	rows, _ := h.DB.Query("SELECT user_id FROM group_members WHERE group_id = ? AND status = 'accepted' AND user_id != ?", input.GroupID, user.ID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var uid int
			rows.Scan(&uid)
			h.DB.Exec(
				"INSERT INTO notifications (user_id, from_user_id, type, group_id, content) VALUES (?, ?, 'group_event', ?, ?)",
				uid, user.ID, input.GroupID, "New event in "+groupTitle+": "+input.Title,
			)
		}
	}

	middleware.JSON(w, http.StatusCreated, models.SuccessResponse{Message: "Event created"})
}

func (h *GroupHandler) RespondEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		middleware.JSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var input struct {
		EventID  int    `json:"event_id"`
		Response string `json:"response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	if input.Response != "going" && input.Response != "not_going" {
		middleware.JSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Response must be 'going' or 'not_going'"})
		return
	}

	var groupID int
	err := h.DB.QueryRow("SELECT group_id FROM group_events WHERE id = ?", input.EventID).Scan(&groupID)
	if err != nil {
		middleware.JSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Event not found"})
		return
	}

	var isMember int
	h.DB.QueryRow("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'", groupID, user.ID).Scan(&isMember)
	if isMember == 0 {
		middleware.JSON(w, http.StatusForbidden, models.ErrorResponse{Error: "You are not a member of this group"})
		return
	}

	_, err = h.DB.Exec(
		"INSERT INTO event_responses (event_id, user_id, response) VALUES (?, ?, ?) ON CONFLICT(event_id, user_id) DO UPDATE SET response = ?",
		input.EventID, user.ID, input.Response, input.Response,
	)
	if err != nil {
		middleware.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to respond to event"})
		return
	}

	middleware.JSON(w, http.StatusOK, models.SuccessResponse{Message: "Response recorded"})
}

func (h *GroupHandler) getGroupMembers(groupID int) ([]models.GroupMember, error) {
	rows, err := h.DB.Query(`
		SELECT gm.id, gm.group_id, gm.user_id, gm.status, gm.role, gm.created_at,
			u.first_name, u.last_name, u.avatar
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ? AND gm.status = 'accepted'
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.GroupMember
	for rows.Next() {
		var m models.GroupMember
		if err := rows.Scan(&m.ID, &m.GroupID, &m.UserID, &m.Status, &m.Role, &m.CreatedAt, &m.FirstName, &m.LastName, &m.Avatar); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func (h *GroupHandler) getGroupPosts(groupID int) ([]models.GroupPost, error) {
	rows, err := h.DB.Query(`
		SELECT gp.id, gp.group_id, gp.user_id, gp.title, gp.content, gp.image, gp.created_at,
			u.first_name || ' ' || u.last_name, u.avatar
		FROM group_posts gp
		JOIN users u ON gp.user_id = u.id
		WHERE gp.group_id = ?
		ORDER BY gp.created_at DESC
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.GroupPost
	for rows.Next() {
		var p models.GroupPost
		if err := rows.Scan(&p.ID, &p.GroupID, &p.UserID, &p.Title, &p.Content, &p.Image, &p.CreatedAt, &p.Username, &p.Avatar); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

func (h *GroupHandler) getGroupEvents(groupID int) ([]models.GroupEvent, error) {
	rows, err := h.DB.Query(`
		SELECT ge.id, ge.group_id, ge.creator_id, ge.title, ge.description, ge.event_time, ge.created_at,
			COALESCE(going.c, 0), COALESCE(notgoing.c, 0)
		FROM group_events ge
		LEFT JOIN (SELECT event_id, COUNT(*) as c FROM event_responses WHERE response = 'going' GROUP BY event_id) going ON ge.id = going.event_id
		LEFT JOIN (SELECT event_id, COUNT(*) as c FROM event_responses WHERE response = 'not_going' GROUP BY event_id) notgoing ON ge.id = notgoing.event_id
		WHERE ge.group_id = ?
		ORDER BY ge.event_time DESC
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.GroupEvent
	for rows.Next() {
		var e models.GroupEvent
		if err := rows.Scan(&e.ID, &e.GroupID, &e.CreatorID, &e.Title, &e.Description, &e.EventTime, &e.CreatedAt, &e.GoingCount, &e.NotGoingCount); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

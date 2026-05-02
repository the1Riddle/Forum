package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"forum/src/data"
)

func (h *Handler) AddComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	user := h.currentUser(r); if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	postIDStr := r.FormValue("post_id")
	content := strings.TrimSpace(r.FormValue("content"))

	postID, err := strconv.Atoi(postIDStr)
	if err != nil || postID <= 0 {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	if content == "" {
		http.Redirect(w, r, "/post?id="+postIDStr+"&error=Comment+cannot+be+empty", http.StatusSeeOther)
		return
	}

	if err := data.CreateComment(h.DB, h.Queries.CreatComment, user.Id, postID, content); err != nil {
		http.Error(w, "Error adding comment", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/post?id="+postIDStr, http.StatusSeeOther)
}
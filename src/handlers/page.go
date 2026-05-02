package handlers

import (
	"html/template"
	"net/http"
	// other imports you already have
)

// ServeCommentsPage serves the comments HTML component
func ServeCommentsPage(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("postId")
	if postID == "" {
		http.Error(w, "Post ID required", http.StatusBadRequest)
		return
	}

	// Parse and execute the template
	tmpl, err := template.ParseFiles("templates/comments.html")
	if err != nil {
		http.Error(w, "Failed to load comments template", http.StatusInternalServerError)
		return
	}

	data := struct {
		PostID string
	}{
		PostID: postID,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err = tmpl.Execute(w, data)
	if err != nil {
		http.Error(w, "Failed to render comments", http.StatusInternalServerError)
		return
	}
}

package handlers

import (
	"net/http"

	"forum/src/data"
)

type homePageData struct {
	Posts      []data.PostDetails
	Categories []data.Category
	User       *data.User
	Filter     string
	Category   string
}

// NewPostForm shows the create post page
func (h *Handler) NewPostForm(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if user is logged in
	user := h.currentUser(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// Get categories from database
	categories, err := data.GetCategories(h.DB, h.Queries.GetCategories)
	if err != nil {
		http.Error(w, "Failed to load categories", http.StatusInternalServerError)
		return
	}

	dataStruct := struct {
		User       interface{}
		Categories []data.Category
	}{
		User:       user,
		Categories: categories,
	}

	err = h.Tmpl.ExecuteTemplate(w, "create_post.html", dataStruct)
	if err != nil {
		http.Error(w, "Failed to load page", http.StatusInternalServerError)
	}
}

// CreatePost handles post creation
func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := h.currentUser(r)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	title := r.FormValue("title")
	content := r.FormValue("content")
	categories := r.Form["categories"]

	if title == "" || content == "" {
		http.Error(w, "Title and content required", http.StatusBadRequest)
		return
	}

	// Create post in database
	postID, err := data.CreatePost(h.DB, h.Queries.CreatPost, user.Id, title, content)
	if err != nil {
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	// Get category IDs and add categories to post
	for _, catName := range categories {
		// Get category ID from name
		var categoryID int
		err := h.DB.QueryRow("SELECT id FROM categories WHERE name = ?", catName).Scan(&categoryID)
		if err == nil {
			data.AddPostToCategory(h.DB, h.Queries.AddPostCategory, postID, categoryID)
		}
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

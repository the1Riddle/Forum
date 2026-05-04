package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"forum/src/data"
)

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		log.Printf("ERROR: Not found path: %s Status: %d", r.URL.Path, http.StatusNotFound)
		http.NotFound(w, r)
		return
	}

	user := h.currentUser(r)
	cats, _ := data.GetCategories(h.DB, h.Queries.GetCategories)

	filter := r.URL.Query().Get("filter")
	category := r.URL.Query().Get("category")

	var posts []data.PostDetails
	var err error

	switch {
	case category != "":
		posts, err = data.GetPostsByCategory(h.DB, h.Queries.FilterPostsByCategory, category)
		log.Printf("INFO: Filtering posts by category: %s Status: %d", category, http.StatusOK)
	case filter == "my" && user != nil:
		posts, err = data.GetUserPosts(h.DB, h.Queries.GetUserPosts, user.Id)
		log.Printf("INFO: Filtering posts by user: %s Status: %d", user.Username, http.StatusOK)
	case filter == "liked" && user != nil:
		posts, err = data.GetLikedPosts(h.DB, h.Queries.GetLikedPosts, user.Id)
		log.Printf("INFO: Filtering posts liked by user: %s Status: %d", user.Username, http.StatusOK)
	default:
		posts, err = data.GetPosts(h.DB, h.Queries.GetPosts)
	}

	if err != nil {
		http.Error(w, "Error loading posts", http.StatusInternalServerError)
		log.Printf("ERROR: Failed to load posts: %v Status: %d", err, http.StatusInternalServerError)
		return
	}

	h.Tmpl.ExecuteTemplate(w, "home.html", data.HomePageData{
		Posts:      posts,
		Categories: cats,
		User:       user,
		Filter:     filter,
		Category:   category,
	})
}

func (h *Handler) CreatPostPage(w http.ResponseWriter, r *http.Request) {
	user := h.currentUser(r)
	if user == nil {
		BackToHome(w, r)
		return
	}
	categories, err := data.GetCategories(h.DB, h.Queries.GetCategories)
	if err != nil {
		log.Printf("ERROR: Failed to load categories: %v Status: %d", err, http.StatusInternalServerError)
		panic("something might have happened")
	}
	h.Tmpl.ExecuteTemplate(w, "create_post.html", data.CreatePostData{
		Categories: categories,
		User:       user,
	})
}

func (h *Handler) CreatPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/post/new", http.StatusSeeOther)
		return
	}

	user := h.currentUser(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	postTitle := strings.TrimSpace((r.FormValue("title")))
	postContent := strings.TrimSpace(r.FormValue("content"))
	whichCategories := r.Form["categories"]

	if postTitle == "" || postContent == "" {
		categories, err := data.GetCategories(h.DB, h.Queries.GetCategories)
		if err != nil {
			log.Printf("ERROR: Failed to load categories: %v Status: %d", err, http.StatusInternalServerError)
			panic("something might have happened")
		}
		h.Tmpl.ExecuteTemplate(w, "create_post.html", data.CreatePostData{
			Categories: categories,
			User:       user,
			Error:      "Title and content are required",
		})
		return
	}
	postId, err := data.CreatePost(h.DB, h.Queries.CreatPost, user.Id, postTitle, postContent)
	if err != nil {
		log.Printf("ERROR: Failed to create post: %v Status: %d", err, http.StatusInternalServerError)
		http.Error(w, "We could not make that post for You", http.StatusInternalServerError)
		return
	}

	for _, id := range whichCategories {
		category, err := strconv.Atoi(id)
		if err == nil {
			data.AddPostToCategory(h.DB, h.Queries.AddPostCategory, postId, category)
		}
	}

	http.Redirect(w, r, "/post?id="+strconv.FormatInt(postId, 10), http.StatusSeeOther)
}

func (h *Handler) ViewPost(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	postID, err := strconv.Atoi(idStr)
	if err != nil || postID <= 0 {
		log.Printf("ERROR: Invalid post ID: %s Status: %d", idStr, http.StatusBadRequest)
		http.NotFound(w, r)
		return
	}

	post, err := data.GetPostByID(h.DB, h.Queries.GetPostByID, postID)
	if err != nil {
		log.Printf("ERROR: Failed to load post: %v Status: %d", err, http.StatusNotFound)
		http.NotFound(w, r)
		return
	}

	comments, err := data.GetPostComments(h.DB, h.Queries.GetPostComments, postID)
	if err != nil {
		log.Printf("ERROR: Failed to load comments: %v Status: %d", err, http.StatusInternalServerError)
		comments = []data.CommentDetails{}
	}

	user := h.currentUser(r)

	h.Tmpl.ExecuteTemplate(w, "post.html", data.PostPageData{
		Post:     post,
		Comments: comments,
		User:     user,
		Error:    r.URL.Query().Get("error"),
	})
}

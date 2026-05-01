package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"

	"forum/src/data"

	_ "github.com/mattn/go-sqlite3"
)

var (
	templates          = template.Must(template.ParseFiles("templates/index.html"))
	dashboardtemplates = template.Must(template.ParseFiles("templates/dashboard.html"))
)

/* ---------------- PAGE HANDLERS ---------------- */

func LoginPage(w http.ResponseWriter, r *http.Request) {
	err := templates.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func DashboardPage(w http.ResponseWriter, r *http.Request) {
	data := struct {
		User       interface{}
		Posts      []interface{}
		Categories []string
	}{
		User:       nil,
		Posts:      []interface{}{},
		Categories: []string{"Technology", "Gaming", "Life & Wellness", "Coding", "Random"},
	}

	err := dashboardtemplates.ExecuteTemplate(w, "dashboard.html", data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

/* ---------------- MAIN ---------------- */

func main() {
	db := data.InitDB()
	defer db.Close()

	queries, err := data.LoadQueries()
	if err != nil {
		log.Fatal("Failed to load queries:", err)
	}

	if _, err := db.Exec(queries.InitializeDB); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	if _, err := db.Exec(queries.SeedCategories); err != nil {
		log.Println("Warning: could not seed categories:", err)
	}

	// Create static directories
	os.MkdirAll("static/uploads", 0755)

	// Serve static files
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Page Routes
	http.HandleFunc("/", LoginPage)
	http.HandleFunc("/dashboard", DashboardPage)

	// Auth Routes
	http.HandleFunc("/login", LoginHandler)
	http.HandleFunc("/register", RegisterHandler)
	http.HandleFunc("/logout", LogoutHandler)

	// API Routes
	http.HandleFunc("/api/upload", UploadImageHandler)
	http.HandleFunc("/api/createpost", CreatePostHandler)
	http.HandleFunc("/api/like", LikeHandler)
	http.HandleFunc("/api/dislike", DislikeHandler)
	http.HandleFunc("/api/comment", CommentHandler)

	// Filter Routes
	http.HandleFunc("/filter", FilterByCategoryHandler)
	http.HandleFunc("/myposts", MyPostsHandler)
	http.HandleFunc("/likedposts", LikedPostsHandler)

	fmt.Println("Server running at http://localhost:8000")
	if err := http.ListenAndServe(":8000", nil); err != nil {
		log.Fatal(err)
	}
}

package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"

	"forum/src/data"
	"forum/src/handlers"
	"forum/src/uitime"

	_ "github.com/mattn/go-sqlite3"
)

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

	funcMap := template.FuncMap{
		"formatDate": uitime.FormatDate,
		// go time formatation sucks.
	}
	
	tmpl, err := template.New("").Funcs(funcMap).ParseGlob("templates/*.html")
	if err != nil {
		log.Fatal("Failed to parse templates:", err)
	}

	handle := handlers.NewHandler(db, queries, tmpl)

	http.HandleFunc("/", handle.Home)

	http.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handle.Register(w, r)
		} else {
			handle.ShowRegister(w, r)
		}
	})

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handle.Login(w, r)
		} else {
			handle.ShowLogin(w, r)
		}
	})

	http.HandleFunc("/post/new", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handle.CreatPost(w, r)
		} else {
			handle.CreatPostPage(w, r)
		}
	})

	http.HandleFunc("/post", handle.ViewPost)
	http.HandleFunc("/logout", handle.Logout)
	http.HandleFunc("/reactions", handle.React)
	http.HandleFunc("/comment", handle.AddComment)

	fmt.Println("Server running at http://localhost:8000")
	if err := http.ListenAndServe(":8000", nil); err != nil {
		log.Fatal(err)
	}
}

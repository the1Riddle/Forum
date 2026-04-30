package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"

	"forum/src/data"
)

var (
	templates          = template.Must(template.ParseFiles("templates/index.html"))
	dashboardtemplates = template.Must(template.ParseFiles("templates/dashboard.html"))
)

/* ---------------- LOGIN PAGE ---------------- */

func LoginPage(w http.ResponseWriter, r *http.Request) {
	err := templates.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

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

	http.HandleFunc("/", LoginPage)

	fmt.Println("Server running at http://localhost:8081")
	if err := http.ListenAndServe(":8081", nil); err != nil {
		log.Fatal(err)
	}
}

package main

import (
	"fmt"
	"html/template"
	"net/http"

	"github.com/gorilla/sessions"
	"forum/middlewares"
	"forum/sqldbs"
	_"database/sql"
	"forum/modules"
)

type UserDetails struct {
	Name string
}

var store = sessions.NewCookieStore([]byte("secret-key"))

// templates
var templates = template.Must(template.ParseFiles("htmltemplates/index.html"))
var dashboardtemplates = template.Must(template.ParseFiles("htmltemplates/dashboard.html"))

/* ---------------- LOGIN PAGE ---------------- */

func LoginPage(w http.ResponseWriter, r *http.Request) {
	err := templates.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

/* ---------------- LOGIN ACTION ---------------- */

func LoginAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	name := r.FormValue("name")
	password := r.FormValue("password")

	session, _ := store.Get(r, "user-session")

	session.Values["name"] = name
	session.Values["password"] = password

	session.Save(r, w)

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

/* ---------------- DASHBOARD ---------------- */

func DashboardHandler(w http.ResponseWriter, r *http.Request) {

	err := dashboardtemplates.ExecuteTemplate(w, "dashboard.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

/* ---------------- NEW ARTICLE ---------------- */

func NewArticle(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}

	title := r.FormValue("title")
	article := r.FormValue("article")

	db := sqldbs.InitDB()
	defer db.Close()

	query := `
	INSERT INTO Articles (author, title, article, likes)
	VALUES (?, ?, ?, ?)
	`

	_, err := db.Exec(query, "ANDREW", title, article, 0)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		fmt.Println("INSERT ERROR:", err)
		return
	}

	fmt.Println("Article added successfully")

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

/* ---------------- LOGOUT ---------------- */

func LoggOut(w http.ResponseWriter, r *http.Request) {

	session, _ := store.Get(r, "user-session")

	session.Values = make(map[interface{}]interface{})
	session.Options.MaxAge = -1

	session.Save(r, w)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

/* ---------------- MAIN ---------------- */

func main() {

	http.HandleFunc("/", LoginPage)
	http.HandleFunc("/login", LoginAction)

	http.HandleFunc("/newarticle", modules.NewArticle)

	http.Handle("/dashboard",
		middlewares.AuthMiddleware(http.HandlerFunc(DashboardHandler)),
	)

	http.HandleFunc("/logout", LoggOut)

	fmt.Println("Server running at http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		panic(err)
	}
}
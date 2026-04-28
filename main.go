package main

import (
	"fmt"
	"html/template"
	"net/http"

	"github.com/gorilla/sessions"
	"forum/middlewares"
	"forum/sqldbs"
	"database/sql"
)

type UserDetails struct {
	Name     string
	Email    string
	Password string
}

var store = sessions.NewCookieStore([]byte("secret-key"))

var templates = template.Must(template.ParseFiles("htmltemplates/index.html"))
var dashboardtemplates = template.Must(template.ParseFiles("htmltemplates/dashboard.html"))

/* ---------------- LOGIN PAGE ---------------- */

func LoginPage(w http.ResponseWriter, r *http.Request) {
	err := templates.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

/* ---------------- LOGIN ACTION (SET SESSION) ---------------- */

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

	session, _ := store.Get(r, "user-session")

	name, _ := session.Values["name"].(string)

	user := UserDetails{
		Name: name,
	}

	err := dashboardtemplates.ExecuteTemplate(w, "dashboard.html", user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

 func NewArticle(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	title := r.FormValue("title")
	article := r.FormValue("article")

	if title == "" || article == "" {
		http.Error(w, "Missing fields", 400)
		return
	}

	db := sqldbs.InitDB()
	defer db.Close()

	query := `
	INSERT INTO Articles (author, title, article,likes)
	VALUES (?, ?, ? ,?)
	`

	_, err := db.Exec(query, "ANDREW", title, article, 5 )
	if err != nil {
		http.Error(w, err.Error(), 500)
		fmt.Println("INSERT ERROR:", err)
		return
	}

	// TEMP: disable until confirmed working
	ReadArticle(db)

	fmt.Println("Article added successfully")

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
} 


func ReadArticle(db *sql.DB) {
	query := `SELECT id,author, title, article,likes FROM Articles`

	rows, err := db.Query(query)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id ,likes int
		var  author, title, article  string

		err := rows.Scan(&id,&author,  &title, &article, &likes)
		if err != nil {
			panic(err)
		}

		fmt.Println("ID:", id)
		fmt.Println("Author:",author)
		fmt.Println("Title:",title)
		fmt.Println("Article:", article)
		fmt.Println("Likes:", likes)
		fmt.Println("------------------------")
	}

	// Always check for errors after iteration
	if err := rows.Err(); err != nil {
		panic(err)
	}
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

		sqldbs.InitDB()

	http.HandleFunc("/", LoginPage)
	http.HandleFunc("/login", LoginAction)
	

	http.HandleFunc("/newarticle", NewArticle)

	// IMPORTANT: login endpoint that sets session
	//http.HandleFunc("/dashboard", LoginAction)

	//http.HandleFunc("/logout", LoggOut)

	// middleware protects dashboard
	http.Handle("/dashboard",
		middlewares.AuthMiddleware(http.HandlerFunc(DashboardHandler)),
	) 

	fmt.Println("Server running at http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		panic(err)
	}
}
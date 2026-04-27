package main

import (
	"fmt"
	"html/template"
	"net/http"

	"github.com/gorilla/sessions"
	"forum/middlewares"
	"forum/sqldbs"
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
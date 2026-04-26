package  main 

import (
"net/http"
"github.com/gorilla/sessions"
"html/template"
"forum/middlewares"
"fmt"

)

type UserDetails struct{
	Name,Email,Password string
}


  var store = sessions.NewCookieStore([]byte("secret-key")) 

var templates = template.Must(template.ParseFiles("htmltemplates/index.html"))
var dashboardtemplates = template.Must(template.ParseFiles("htmltemplates/dashboard.html"))


  func LoginPage(w http.ResponseWriter, r *http.Request) {
	err := templates.ExecuteTemplate(w, "index.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	//http.Redirect(w, r, "/Dashboard", http.StatusSeeOther)
}


func DashboardHandler(w http.ResponseWriter, r *http.Request) {

	var User UserDetails


	// only allow "/"
	if r.URL.Path != "/dashboard" {
		http.NotFound(w, r)
		return
	}

	// get session
	session, _ := store.Get(r, "user-session")

	// create variable
	name := "Aokutu"
	User.Name =  name 

	// assign to session
	session.Values["name"] = name

	// save session
	session.Save(r, w)
/*
	fmt.Fprintf(w, "Hello from Go web server 🚀\n")
	fmt.Fprintf(w, "Name stored in session: %s\n", name)
	*/ 

		err := dashboardtemplates.ExecuteTemplate(w, "dashboard.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

		


}




func LoggOut(w http.ResponseWriter, r *http.Request) {

	session, _ := store.Get(r, "session-name")

	// Clear session values
	session.Values = make(map[interface{}]interface{})

	// Destroy cookie
	session.Options.MaxAge = -1
	session.Options.Path = "/"

	// Save session changes (important)
	session.Save(r, w)

	// Redirect (must be last, and no writes before it)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

/*
*/

func main (){
	http.HandleFunc("/",LoginPage)
	http.HandleFunc("/logout",LoggOut)
	http.Handle("/dashboard",middlewares.AuthMiddleware(http.HandlerFunc(DashboardHandler))) 


	fmt.Println("Server running at http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		panic(err)
	}
}

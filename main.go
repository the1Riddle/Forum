package  main 

import (
"net/http"
"github.com/gorilla/sessions"
"html/template"
"fmt"

)


  var store = sessions.NewCookieStore([]byte("secret-key")) 

var templates = template.Must(template.ParseFiles("htmltemplates/loggin.html"))


  func LoginPage(w http.ResponseWriter, r *http.Request) {
	err := templates.ExecuteTemplate(w, "loggin.html", nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	//http.Redirect(w, r, "/Dashboard", http.StatusSeeOther)
}

func DashboardHandler(w http.ResponseWriter, r *http.Request) {

	// only allow "/"
	if r.URL.Path != "/Dashboard" {
		http.NotFound(w, r)
		return
	}

	// get session
	session, _ := store.Get(r, "user-session")

	// create variable
	name := "Aokutu"

	// assign to session
	session.Values["name"] = name

	// save session
	session.Save(r, w)

	fmt.Fprintf(w, "Hello from Go web server 🚀\n")
	fmt.Fprintf(w, "Name stored in session: %s\n", name)

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



func main (){
	http.HandleFunc("/",LoginPage)
	http.HandleFunc("/loggout",LoggOut)
	http.HandleFunc("/Dashboard",DashboardHandler)

	fmt.Println("Server running at http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		panic(err)
	}
}

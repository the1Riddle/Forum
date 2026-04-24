package  main 

import (
"net/http"
"github.com/gorilla/sessions"
"fmt"

)


  var store = sessions.NewCookieStore([]byte("secret-key")) 


func homeHandler(w http.ResponseWriter, r *http.Request) {

	// only allow "/"
	if r.URL.Path != "/" {
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
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/loggout",LoggOut)

	fmt.Println("Server running at http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		panic(err)
	}
}

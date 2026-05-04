package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	//"os"

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

	/**
	//_, err = os.Stat("./src/data/myforum.db")
	checkData, _ := os.ReadFile("./src/data/myforum.db")
	if len(checkData) == 0 {
		if os.IsNotExist(err) {
			log.Println("Database not found, initializing...")
			if _, err = db.Exec(queries.InitializeDB); err != nil {
				log.Fatal("Failed to initialize database:", err)
			}
			if _, err = db.Exec(queries.SeedCategories); err != nil {
				log.Println("Warning: could not seed categories:", err)
			}
		} else {
			log.Fatal("Error checking database file:", err)
			return
		}
	}
		**/

	funcMap := template.FuncMap{
		"formatDate": uitime.FormatDate,
		// go time formatation sucks.
	}

	/**
	so here we can just pass all templates that will intern be used in the handlers,
	and the queries and db connection as well.

	ive learned that we can also change all our html templates to .tmpl
	then just pass them to server with pashtml func from template1.

	but i plan not to do that.
	**/
	tmpl, err := template.New("").Funcs(funcMap).ParseGlob("templates/*.html")
	if err != nil {
		log.Fatal("Failed to parse templates:", err)
	}

	handle := handlers.NewHandler(db, queries, tmpl)

	http.HandleFunc("/", handle.Home)
	/** im making this home and not login since
	in the instractions we were told users can view posts
	even when they have not logged in,
	so this will be the home page where they can see all posts
	 and categories and stuff,
	 and then they can click login to login or register to register.


	 dont change it unless you plan to make it work in another way,
	 but this is pafectly fine for now.
	**/

	// removed those static since
	// im not ready to handle them but if yall are its fine by me.

	/** i dont think i can fine tune it
	var responceRequest = func(w http.ResponseWriter, r *http.Request) {
		if r.Me
	}
	**/

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

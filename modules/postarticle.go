package modules

import (
	"net/http"
	"forum/sqldbs"
	_"database/sql"
	"fmt"
)


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



	fmt.Println("Article added successfully")

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
} 

package modules

import (
	"database/sql"
	_"fmt"
)


type ArticleDetails struct{
	Id int
	Author ,Title string

}


func Articlestitle(db *sql.DB) []ArticleDetails {

	query := `SELECT id, author, title FROM Articles`

	rows, err := db.Query(query)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var articles []ArticleDetails

	for rows.Next() {

		var a ArticleDetails

		err := rows.Scan(&a.Id, &a.Author, &a.Title)
		if err != nil {
			panic(err)
		}

		articles = append(articles, a)
	}

	if err := rows.Err(); err != nil {
		panic(err)
	}

	return articles
}
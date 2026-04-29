package main

import (
	"database/sql"
	"fmt"
	"log"
	"forum/src/data"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "./src/data/myforum.db?_journal_mode=WAL")
	if err != nil {
		log.Fatal(err)
	}

	db.SetMaxOpenConns(1)

	defer db.Close()

	myQueries, err := data.LoadQueries()
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(myQueries.InitializeDB)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Database initialized successfully")
}

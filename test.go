package main

import (
	"fmt"
	"log"

	"forum/src/data"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db := data.InitDB()
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

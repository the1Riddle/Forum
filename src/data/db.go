package data

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func InitDB() *sql.DB {
	var err error

	db, err := sql.Open("sqlite3", "./src/data/myforum.db?_journal_mode=WAL")
	if err != nil {
		log.Fatal(err)
	}

	db.SetMaxOpenConns(1)

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	return db
}

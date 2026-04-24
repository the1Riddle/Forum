package main

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", "test.db")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		panic(err)
	}

	fmt.Println("SQLite connected successfully")

	//UserTable(db)
	AddUser(db)
}

func UserTable(db *sql.DB) {
	createTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT,
		name TEXT,
		password TEXT
	);`

	_, err := db.Exec(createTable)
	if err != nil {
		panic(err)
	}

	fmt.Println("Users table created successfully")
}

func AddUser(db *sql.DB) {
	query := `INSERT INTO users(email, name, password) VALUES(?, ?, ?)`
	_, err := db.Exec(query, "muleli.haddassah@gmail.com", "Andrew", "andrew")
	if err != nil {
		panic(err)
	}

	fmt.Println("User added successfully")
}



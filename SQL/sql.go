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
	//AddUser(db)
	// DeleteUser(db,4)
	ReadUsers(db)

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

func ReadUsers(db *sql.DB) {
	query := `SELECT id, email, name, password FROM users`

	rows, err := db.Query(query)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var email, name, password string

		err := rows.Scan(&id, &email, &name, &password)
		if err != nil {
			panic(err)
		}

		fmt.Println("ID:", id)
		fmt.Println("Email:", email)
		fmt.Println("Name:", name)
		fmt.Println("Password:", password)
		fmt.Println("------------------------")
	}

	// Always check for errors after iteration
	if err := rows.Err(); err != nil {
		panic(err)
	}
}


 func DeleteUser(db *sql.DB, id int) {
	query := `DELETE FROM users WHERE id = ?`

	result, err := db.Exec(query, id)
	if err != nil {
		panic(err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		panic(err)
	}

	if rowsAffected == 0 {
		fmt.Println("No user found with that ID")
	} else {
		fmt.Println("User deleted successfully")
	}
} 


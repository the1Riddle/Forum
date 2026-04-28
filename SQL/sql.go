package sqldbs

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
	"fmt"
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
	//ChatTable(db)
	//ReadUsers(db)
	ArticlesTable(db)
	ListTables(db)

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


func ChatTable(db *sql.DB) {
	createTable := `
	CREATE TABLE IF NOT EXISTS Chats (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		fromemail TEXT,
		toemail TEXT,
		message TEXT,
		time TEXT
	);`

	_, err := db.Exec(createTable)
	if err != nil {
		panic(err)
	}

	fmt.Println("Chats table created successfully")
}

func ArticlesTable(db *sql.DB) {

	createTable := `
	CREATE TABLE IF NOT EXISTS Articles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		author TEXT,
		title TEXT,
		article TEXT,
		likes INT,
		dislikes INT,
		time TEXT
	);`

	_, err := db.Exec(createTable)
	if err != nil {
		panic(err)
	}

	fmt.Println("Articles table created successfully")
}



func ListTables(db *sql.DB) {
	rows, err := db.Query(`
		SELECT name 
		FROM sqlite_master 
		WHERE type='table'
	`)
	if err != nil {
		log.Fatal("failed to list tables:", err)
	}
	defer rows.Close()

	fmt.Println("📦 Tables in database:")

	for rows.Next() {
		var name string

		err := rows.Scan(&name)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Println("-", name)
	}

	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
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


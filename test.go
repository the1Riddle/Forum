package main

import (
	"fmt"
	"log"
	"net/http"

	"forum/src/data"
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

	fmt.Println("Server running at http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

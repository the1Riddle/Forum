package sqlite

import (
	"database/sql"
	"fmt"
	"log"
	"sort"
	"strings"

	"forum/pkg/db"

	_ "github.com/mattn/go-sqlite3"
)

func InitDB(dbPath string) *sql.DB {
	sqldb, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	sqldb.SetMaxOpenConns(1)

	if err := sqldb.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	if err := runMigrations(sqldb); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("Migrations applied successfully")
	return sqldb
}

func runMigrations(sqldb *sql.DB) error {
	sqldb.Exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)")

	entries, err := db.MigrationsFS.ReadDir(db.MigrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var upFiles []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			upFiles = append(upFiles, e.Name())
		}
	}
	sort.Strings(upFiles)

	for _, file := range upFiles {
		var version int
		fmt.Sscanf(file, "%d_", &version)

		var exists int
		sqldb.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = ?", version).Scan(&exists)
		if exists > 0 {
			continue
		}

		content, err := db.MigrationsFS.ReadFile(db.MigrationsDir + "/" + file)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", file, err)
		}

		statements := strings.Split(string(content), ";")
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := sqldb.Exec(stmt); err != nil {
				return fmt.Errorf("failed to execute migration %s: %w\nSQL: %s", file, err, stmt)
			}
		}

		if _, err := sqldb.Exec("INSERT INTO schema_migrations (version) VALUES (?)", version); err != nil {
			return fmt.Errorf("failed to record migration %s: %w", file, err)
		}

		log.Printf("Applied migration: %s", file)
	}

	return nil
}

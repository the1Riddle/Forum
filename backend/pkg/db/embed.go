package db

import "embed"

//go:embed migrations/sqlite/*.up.sql
var MigrationsFS embed.FS

const MigrationsDir = "migrations/sqlite"

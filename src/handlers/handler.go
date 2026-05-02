package handlers

import (
	"database/sql"
	"html/template"

	"forum/src/data"
)

/**
so with this handler struct:
 we can easily pass around our database connection, queries,
 and templates to all our handler functions without needing to use global variables. 
*/

type Handler struct {
	DB      *sql.DB
	Queries *data.Queries
	Tmpl    *template.Template
}

func NewHandler(db *sql.DB, queries *data.Queries, tmpl *template.Template) *Handler {
	return &Handler{DB: db, Queries: queries, Tmpl: tmpl}
}

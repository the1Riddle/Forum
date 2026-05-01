package handlers

import (
	//"net/http"

	"forum/src/data"
)

type homePageData struct {
	Posts      []data.PostDetails
	Categories []data.Category
	User       *data.User
	Filter     string
	Category   string
}
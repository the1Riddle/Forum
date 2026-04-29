package data

type Post struct {
	Id        int
	UserId    int
	Title     string
	Content   string
	CreatedAt string
}

type PostDetails struct {
	Id        int
	UserId    int
	Title     string
	Content   string
	CreatedAt string
	Username  string
	Likes     int
	Dislikes  int
}

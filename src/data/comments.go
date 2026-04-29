package data

type Comment struct {
	Id        int
	UserId    int
	PostId    int
	Content   string
	CreatedAt string
}

type CommentDetails struct {
	Id        int
	UserId    int
	PostId    int
	Content   string
	CreatedAt string
	Username  string
	Likes     int
	Dislikes  int
}

type Category struct {
	Id   int
	Name string
}

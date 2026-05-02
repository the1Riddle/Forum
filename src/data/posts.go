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

type CreatePostData struct {
	Categories []Category
	User       *User
	Error      string
}

type PostPageData struct {
	Post     *PostDetails
	Comments []CommentDetails
	User     *User
	Error    string
}

type HomePageData struct {
	Posts      []PostDetails
	Categories []Category
	User       *User
	Filter     string
	Category   string
}

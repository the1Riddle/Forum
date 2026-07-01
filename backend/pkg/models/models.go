package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	DateOfBirth  string    `json:"date_of_birth"`
	Avatar       string    `json:"avatar"`
	Nickname     string    `json:"nickname"`
	AboutMe      string    `json:"about_me"`
	IsPublic     bool      `json:"is_public"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserPublic struct {
	ID              int    `json:"id"`
	Email           string `json:"email"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Avatar          string `json:"avatar"`
	Nickname        string `json:"nickname"`
	AboutMe         string `json:"about_me"`
	IsPublic        bool   `json:"is_public"`
	FollowersCount  int    `json:"followers_count"`
	FollowingCount  int    `json:"following_count"`
	PostCount       int    `json:"post_count"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    int       `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Post struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	Nickname       string    `json:"nickname"`
	Title          string    `json:"title"`
	Content        string    `json:"content"`
	Image          string    `json:"image"`
	Privacy        string    `json:"privacy"`
	CreatedAt      time.Time `json:"created_at"`
	Avatar         string    `json:"avatar"`
	LikesCount     int       `json:"likes_count"`
	DislikesCount  int       `json:"dislikes_count"`
	CommentsCount  int       `json:"comments_count"`
}

type PostPrivacyUser struct {
	PostID int `json:"post_id"`
	UserID int `json:"user_id"`
}

type Comment struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	PostID        int       `json:"post_id"`
	Content       string    `json:"content"`
	Image         string    `json:"image"`
	CreatedAt     time.Time `json:"created_at"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	Nickname      string    `json:"nickname"`
	Avatar        string    `json:"avatar"`
	LikesCount    int       `json:"likes_count"`
	DislikesCount int       `json:"dislikes_count"`
}

type Follower struct {
	ID         int       `json:"id"`
	FollowerID int       `json:"follower_id"`
	FolloweeID int       `json:"followee_id"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	Username   string    `json:"username"`
	Avatar     string    `json:"avatar"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
}

type Group struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatorID   int       `json:"creator_id"`
	CreatedAt   time.Time `json:"created_at"`
	MemberCount int       `json:"member_count"`
	Role        string    `json:"role"`
}

type GroupMember struct {
	ID        int       `json:"id"`
	GroupID   int       `json:"group_id"`
	UserID    int       `json:"user_id"`
	Status    string    `json:"status"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
}

type GroupPost struct {
	ID        int       `json:"id"`
	GroupID   int       `json:"group_id"`
	UserID    int       `json:"user_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Image     string    `json:"image"`
	CreatedAt time.Time `json:"created_at"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
}

type GroupPostComment struct {
	ID          int       `json:"id"`
	GroupPostID int       `json:"group_post_id"`
	UserID      int       `json:"user_id"`
	Content     string    `json:"content"`
	Image       string    `json:"image"`
	CreatedAt   time.Time `json:"created_at"`
	Username    string    `json:"username"`
	Avatar      string    `json:"avatar"`
}

type GroupEvent struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	CreatorID   int       `json:"creator_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	EventTime   time.Time `json:"event_time"`
	CreatedAt   time.Time `json:"created_at"`
	GoingCount  int       `json:"going_count"`
	NotGoingCount int     `json:"not_going_count"`
}

type EventResponse struct {
	ID        int       `json:"id"`
	EventID   int       `json:"event_id"`
	UserID    int       `json:"user_id"`
	Response  string    `json:"response"`
	CreatedAt time.Time `json:"created_at"`
}

type Notification struct {
	ID         int       `json:"id"`
	UserID     int       `json:"user_id"`
	FromUserID *int      `json:"from_user_id"`
	Type       string    `json:"type"`
	GroupID    *int      `json:"group_id"`
	Content    string    `json:"content"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
	FromName   string    `json:"from_name"`
	GroupTitle string    `json:"group_title"`
}

type Message struct {
	ID         int       `json:"id"`
	SenderID   int       `json:"sender_id"`
	ReceiverID *int      `json:"receiver_id"`
	GroupID    *int      `json:"group_id"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
	Username   string    `json:"username"`
	Avatar     string    `json:"avatar"`
}

type Reaction struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	PostID    *int      `json:"post_id"`
	CommentID *int      `json:"comment_id"`
	Type      string    `json:"type"`
}

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

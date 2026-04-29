package data

import (
	"database/sql"
)

func GetPosts(db *sql.DB, query string) ([]PostDetails, error) {
	rows, err := db.Query(query)
	return scanPostRows(rows, err)
}

func GetPostByID(db *sql.DB, query string, postID int) (*PostDetails, error) {
	row := db.QueryRow(query, postID)
	var p PostDetails
	err := row.Scan(&p.Id, &p.UserId, &p.Title, &p.Content, &p.CreatedAt, &p.Username, &p.Likes, &p.Dislikes)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func GetUserPosts(db *sql.DB, query string, userID int) ([]PostDetails, error) {
	rows, err := db.Query(query, userID)
	return scanPostRows(rows, err)
}

func GetLikedPosts(db *sql.DB, query string, userID int) ([]PostDetails, error) {
	rows, err := db.Query(query, userID)
	return scanPostRows(rows, err)
}

func GetPostsByCategory(db *sql.DB, query string, categoryName string) ([]PostDetails, error) {
	rows, err := db.Query(query, categoryName)
	return scanPostRows(rows, err)
}

func GetPostComments(db *sql.DB, query string, postID int) ([]CommentDetails, error) {
	rows, err := db.Query(query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var comments []CommentDetails
	for rows.Next() {
		var c CommentDetails
		if err := rows.Scan(&c.Id, &c.UserId, &c.PostId, &c.Content, &c.CreatedAt, &c.Username, &c.Likes, &c.Dislikes); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func GetCategories(db *sql.DB, query string) ([]Category, error) {
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cats []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.Id, &c.Name); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func GetUserByEmail(db *sql.DB, query string, email string) (*User, error) {
	row := db.QueryRow(query, email)
	var u User
	err := row.Scan(&u.Id, &u.Email, &u.Username, &u.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func CreateUser(db *sql.DB, query string, email, username, passwordHash string) error {
	_, err := db.Exec(query, email, username, passwordHash)
	return err
}

// CreatePost inserts a new post and returns its ID.
func CreatePost(db *sql.DB, query string, userID int, title, content string) (int64, error) {
	res, err := db.Exec(query, userID, title, content)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func AddPostToCategory(db *sql.DB, query string, postID int64, categoryID int) error {
	_, err := db.Exec(query, postID, categoryID)
	return err
}

func CreateComment(db *sql.DB, query string, userID, postID int, content string) error {
	_, err := db.Exec(query, userID, postID, content)
	return err
}

func getUserReactionPost(db *sql.DB, query string, userID, postID int) (string, error) {
	row := db.QueryRow(query, userID, postID)
	var rtype string
	err := row.Scan(&rtype)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return rtype, err
}

func getUserReactionComment(db *sql.DB, query string, userID, commentID int) (string, error) {
	row := db.QueryRow(query, userID, commentID)
	var rtype string
	err := row.Scan(&rtype)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return rtype, err
}

func ReactToPost(db *sql.DB, q *Queries, userID, postID int, reactionType string) error {
	existing, err := getUserReactionPost(db, q.GetUserReactionPost, userID, postID)
	if err != nil {
		return err
	}
	if existing != "" {
		_, err = db.Exec(q.DeleteReactionPost, userID, postID)
		if err != nil {
			return err
		}
		if existing == reactionType {
			return nil // toggled off
		}
	}
	_, err = db.Exec(q.ReactToPost, userID, postID, reactionType)
	return err
}

func ReactToComment(db *sql.DB, q *Queries, userID, commentID int, reactionType string) error {
	existing, err := getUserReactionComment(db, q.GetUserReactionComment, userID, commentID)
	if err != nil {
		return err
	}
	if existing != "" {
		_, err = db.Exec(q.DeleteReactionComment, userID, commentID)
		if err != nil {
			return err
		}
		if existing == reactionType {
			return nil // toggled off
		}
	}
	_, err = db.Exec(q.ReactToComment, userID, commentID, reactionType)
	return err
}

func scanPostRows(rows *sql.Rows, err error) ([]PostDetails, error) {
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var posts []PostDetails
	for rows.Next() {
		var p PostDetails
		if err := rows.Scan(&p.Id, &p.UserId, &p.Title, &p.Content, &p.CreatedAt, &p.Username, &p.Likes, &p.Dislikes); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

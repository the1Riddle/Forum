package comments

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Comment struct {
	ID           string    `json:"id"`
	PostID       string    `json:"post_id"`
	UserID       string    `json:"user_id"`
	Username     string    `json:"username"`
	Content      string    `json:"content"`
	Likes        int       `json:"likes"`
	Dislikes     int       `json:"dislikes"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserReaction string    `json:"user_reaction,omitempty"`
}

type CommentDB struct {
	DB *sql.DB
}

func NewCommentDB(db *sql.DB) *CommentDB {
	return &CommentDB{DB: db}
}

// generateID creates a unique ID - THIS FIXES THE ERROR
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func (c *CommentDB) CreateComment(postID, userID, content string) (*Comment, error) {
	if content == "" {
		return nil, errors.New("comment cannot be empty")
	}

	if len(content) > 2000 {
		return nil, errors.New("comment too long (max 2000 characters)")
	}

	var postExists bool
	err := c.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM posts WHERE id = ?)`, postID).Scan(&postExists)
	if err != nil || !postExists {
		return nil, errors.New("post not found")
	}

	commentID := generateID() // Now this works!
	now := time.Now()

	_, err = c.DB.Exec(`
        INSERT INTO comments (id, post_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `, commentID, postID, userID, content, now)

	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	var username string
	c.DB.QueryRow(`SELECT username FROM users WHERE id = ?`, userID).Scan(&username)

	return &Comment{
		ID:        commentID,
		PostID:    postID,
		UserID:    userID,
		Username:  username,
		Content:   content,
		Likes:     0,
		Dislikes:  0,
		CreatedAt: now,
	}, nil
}

func (c *CommentDB) GetCommentsByPostID(postID string) ([]Comment, error) {
	rows, err := c.DB.Query(`
        SELECT c.id, c.post_id, c.user_id, u.username, c.content, 
               COALESCE(c.likes, 0), COALESCE(c.dislikes, 0), c.created_at
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `, postID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var comment Comment
		err := rows.Scan(&comment.ID, &comment.PostID, &comment.UserID, &comment.Username,
			&comment.Content, &comment.Likes, &comment.Dislikes, &comment.CreatedAt)
		if err != nil {
			continue
		}
		comments = append(comments, comment)
	}

	return comments, nil
}

func (c *CommentDB) UpdateComment(commentID, userID, content string) error {
	if content == "" {
		return errors.New("comment cannot be empty")
	}

	var ownerID string
	err := c.DB.QueryRow(`SELECT user_id FROM comments WHERE id = ?`, commentID).Scan(&ownerID)
	if err != nil {
		return errors.New("comment not found")
	}

	if ownerID != userID {
		return errors.New("you can only edit your own comments")
	}

	_, err = c.DB.Exec(`UPDATE comments SET content = ?, updated_at = ? WHERE id = ?`,
		content, time.Now(), commentID)

	return err
}

func (c *CommentDB) DeleteComment(commentID, userID string, isAdmin bool) error {
	if !isAdmin {
		var ownerID string
		err := c.DB.QueryRow(`SELECT user_id FROM comments WHERE id = ?`, commentID).Scan(&ownerID)
		if err != nil {
			return errors.New("comment not found")
		}
		if ownerID != userID {
			return errors.New("you can only delete your own comments")
		}
	}

	_, err := c.DB.Exec(`DELETE FROM comments WHERE id = ?`, commentID)
	return err
}

func (c *CommentDB) LikeComment(commentID, userID string) (int, int, error) {
	var existingReaction string
	err := c.DB.QueryRow(`
        SELECT type FROM comment_reactions 
        WHERE comment_id = ? AND user_id = ?
    `, commentID, userID).Scan(&existingReaction)

	if err == nil {
		if existingReaction == "like" {
			c.DB.Exec(`DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ?`, commentID, userID)
			c.DB.Exec(`UPDATE comments SET likes = likes - 1 WHERE id = ?`, commentID)
		} else if existingReaction == "dislike" {
			c.DB.Exec(`UPDATE comment_reactions SET type = 'like' WHERE comment_id = ? AND user_id = ?`, commentID, userID)
			c.DB.Exec(`UPDATE comments SET likes = likes + 1, dislikes = dislikes - 1 WHERE id = ?`, commentID)
		}
	} else {
		c.DB.Exec(`INSERT INTO comment_reactions (comment_id, user_id, type) VALUES (?, ?, 'like')`, commentID, userID)
		c.DB.Exec(`UPDATE comments SET likes = likes + 1 WHERE id = ?`, commentID)
	}

	var likes, dislikes int
	c.DB.QueryRow(`SELECT likes, dislikes FROM comments WHERE id = ?`, commentID).Scan(&likes, &dislikes)

	return likes, dislikes, nil
}

func (c *CommentDB) DislikeComment(commentID, userID string) (int, int, error) {
	var existingReaction string
	err := c.DB.QueryRow(`
        SELECT type FROM comment_reactions 
        WHERE comment_id = ? AND user_id = ?
    `, commentID, userID).Scan(&existingReaction)

	if err == nil {
		if existingReaction == "dislike" {
			c.DB.Exec(`DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ?`, commentID, userID)
			c.DB.Exec(`UPDATE comments SET dislikes = dislikes - 1 WHERE id = ?`, commentID)
		} else if existingReaction == "like" {
			c.DB.Exec(`UPDATE comment_reactions SET type = 'dislike' WHERE comment_id = ? AND user_id = ?`, commentID, userID)
			c.DB.Exec(`UPDATE comments SET likes = likes - 1, dislikes = dislikes + 1 WHERE id = ?`, commentID)
		}
	} else {
		c.DB.Exec(`INSERT INTO comment_reactions (comment_id, user_id, type) VALUES (?, ?, 'dislike')`, commentID, userID)
		c.DB.Exec(`UPDATE comments SET dislikes = dislikes + 1 WHERE id = ?`, commentID)
	}

	var likes, dislikes int
	c.DB.QueryRow(`SELECT likes, dislikes FROM comments WHERE id = ?`, commentID).Scan(&likes, &dislikes)

	return likes, dislikes, nil
}

func (c *CommentDB) GetUserReaction(commentID, userID string) string {
	var reactionType string
	err := c.DB.QueryRow(`
        SELECT type FROM comment_reactions 
        WHERE comment_id = ? AND user_id = ?
    `, commentID, userID).Scan(&reactionType)

	if err != nil {
		return ""
	}
	return reactionType
}

package data

import (
	myEmbed "forum/src"
)

type Queries struct {
	CreatUser              string
	CreatPost              string
	CreatComment           string
	CreatSession           string
	InitializeDB           string
	SeedCategories         string
	AddPostCategory        string
	GetPosts               string
	GetPostByID            string
	GetUserPosts           string
	GetPostComments        string
	GetUserByEmail         string
	GetSessionByToken      string
	GetSessionByUserID     string
	DeleteSessionByToken   string
	ReactToPost            string
	ReactToComment         string
	GetPostByReactions     string
	GetLikedPosts          string
	FilterPostsByCategory  string
	GetCategories          string
	GetUserReactionPost    string
	GetUserReactionComment string
	DeleteReactionPost     string
	DeleteReactionComment  string
	GetUserByID            string
}

/// database --> readfrom file --> store in struct --> use in handlers

func LoadQueries() (*Queries, error) {
	read := func(name string) (string, error) {
		b, err := myEmbed.QueryFiles.ReadFile("queries/" + name)
		if err != nil {
			return "", err
		}
		return string(b), nil
	}

	creatUser, err := read("creat_user.sql")
	if err != nil {
		return nil, err
	}
	creatPost, err := read("creat_post.sql")
	if err != nil {
		return nil, err
	}
	creatComment, err := read("creat_comment.sql")
	if err != nil {
		return nil, err
	}
	creatSession, err := read("creat_session.sql")
	if err != nil {
		return nil, err
	}
	initializeDB, err := read("initialize_db.sql")
	if err != nil {
		return nil, err
	}
	seedCategories, err := read("seed_categories.sql")
	if err != nil {
		return nil, err
	}
	addPostCategory, err := read("add_post_to_category.sql")
	if err != nil {
		return nil, err
	}
	getPosts, err := read("get_posts.sql")
	if err != nil {
		return nil, err
	}
	getPostByID, err := read("get_post_by_id.sql")
	if err != nil {
		return nil, err
	}
	getUserPosts, err := read("get_user_posts.sql")
	if err != nil {
		return nil, err
	}
	getPostComments, err := read("get_post_comments.sql")
	if err != nil {
		return nil, err
	}
	getUserByEmail, err := read("get_user_by_email.sql")
	if err != nil {
		return nil, err
	}
	getSessionByToken, err := read("get_session_by_token.sql")
	if err != nil {
		return nil, err
	}
	getSessionByUserID, err := read("get_session_by_user_id.sql")
	if err != nil {
		return nil, err
	}
	deleteSessionByToken, err := read("delete_session_by_token.sql")
	if err != nil {
		return nil, err
	}
	reactToPost, err := read("react_to_post.sql")
	if err != nil {
		return nil, err
	}
	reactToComment, err := read("react_to_comment.sql")
	if err != nil {
		return nil, err
	}
	getPostByReactions, err := read("get_post_by_reactions.sql")
	if err != nil {
		return nil, err
	}
	getLikedPosts, err := read("get_posts_liked_by_user.sql")
	if err != nil {
		return nil, err
	}
	filterPostsByCategory, err := read("filter_posts_by_category.sql")
	if err != nil {
		return nil, err
	}
	getCategories, err := read("get_categories.sql")
	if err != nil {
		return nil, err
	}
	getUserReactionPost, err := read("get_user_reaction_post.sql")
	if err != nil {
		return nil, err
	}
	getUserReactionComment, err := read("get_user_reaction_comment.sql")
	if err != nil {
		return nil, err
	}
	deleteReactionPost, err := read("delete_reaction_post.sql")
	if err != nil {
		return nil, err
	}
	deleteReactionComment, err := read("delete_reaction_comment.sql")
	if err != nil {
		return nil, err
	}
	getUserByID, err := read("get_user_by_id.sql")
	if err != nil {
		return nil, err
	}

	return &Queries{
		CreatUser:              creatUser,
		CreatPost:              creatPost,
		CreatComment:           creatComment,
		CreatSession:           creatSession,
		InitializeDB:           initializeDB,
		SeedCategories:         seedCategories,
		AddPostCategory:        addPostCategory,
		GetPosts:               getPosts,
		GetPostByID:            getPostByID,
		GetUserPosts:           getUserPosts,
		GetPostComments:        getPostComments,
		GetUserByEmail:         getUserByEmail,
		GetSessionByToken:      getSessionByToken,
		GetSessionByUserID:     getSessionByUserID,
		DeleteSessionByToken:   deleteSessionByToken,
		ReactToPost:            reactToPost,
		ReactToComment:         reactToComment,
		GetPostByReactions:     getPostByReactions,
		GetLikedPosts:          getLikedPosts,
		FilterPostsByCategory:  filterPostsByCategory,
		GetCategories:          getCategories,
		GetUserReactionPost:    getUserReactionPost,
		GetUserReactionComment: getUserReactionComment,
		DeleteReactionPost:     deleteReactionPost,
		DeleteReactionComment:  deleteReactionComment,
		GetUserByID:            getUserByID,
	}, nil
}

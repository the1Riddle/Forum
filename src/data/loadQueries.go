package data

import (
	myEmbed "forum/src"
)

/**
just tired of making changes coz
it would mean i change the names
of my sql files to mach the struct
then after update the code, but:

we can use a map -> type QueryRegistry map[string]string
*/

type Queries struct {
	CreatUser             string
	CreatPost             string
	CreatComment          string
	CreatSession          string
	InitializeDB          string
	SeedCategories        string
	AddPostCategory       string
	GetPosts              string
	GetUserPosts          string
	GetPostComments       string
	GetUserByEmail        string
	GetSessionByToken     string
	DeleteSessionByToken  string
	ReactToPost           string
	GetPostReactions      string
	GetLikedPosts         string
	FilterPostsByCategory string
}

func LoadQueries() (*Queries, error) {
	creatUser, err := myEmbed.QueryFiles.ReadFile("queries/creat_user.sql")
	if err != nil {
		return nil, err
	}

	creatPost, err := myEmbed.QueryFiles.ReadFile("queries/creat_post.sql")
	if err != nil {
		return nil, err
	}

	creatComment, err := myEmbed.QueryFiles.ReadFile("queries/creat_comment.sql")
	if err != nil {
		return nil, err
	}

	creatSession, err := myEmbed.QueryFiles.ReadFile("queries/creat_session.sql")
	if err != nil {
		return nil, err
	}

	initializeDB, err := myEmbed.QueryFiles.ReadFile("queries/initialize_db.sql")
	if err != nil {
		return nil, err
	}

	seedCategories, err := myEmbed.QueryFiles.ReadFile("queries/seed_categories.sql")
	if err != nil {
		return nil, err
	}

	addPostCategory, err := myEmbed.QueryFiles.ReadFile("queries/add_post_to_category.sql")
	if err != nil {
		return nil, err
	}

	getPosts, err := myEmbed.QueryFiles.ReadFile("queries/get_posts.sql")
	if err != nil {
		return nil, err
	}

	getUserPosts, err := myEmbed.QueryFiles.ReadFile("queries/get_user_posts.sql")
	if err != nil {
		return nil, err
	}

	getPostComments, err := myEmbed.QueryFiles.ReadFile("queries/get_post_comments.sql")
	if err != nil {
		return nil, err
	}

	getUserByEmail, err := myEmbed.QueryFiles.ReadFile("queries/get_user_by_email.sql")
	if err != nil {
		return nil, err
	}

	getSessionByToken, err := myEmbed.QueryFiles.ReadFile("queries/get_session_by_token.sql")
	if err != nil {
		return nil, err
	}

	deleteSessionByToken, err := myEmbed.QueryFiles.ReadFile("queries/delete_session_by_token.sql")
	if err != nil {
		return nil, err
	}

	reactToPost, err := myEmbed.QueryFiles.ReadFile("queries/react_to_post.sql")
	if err != nil {
		return nil, err
	}

	getPostReactions, err := myEmbed.QueryFiles.ReadFile("queries/get_post_by_reactions.sql")
	if err != nil {
		return nil, err
	}

	getLikedPosts, err := myEmbed.QueryFiles.ReadFile("queries/get_posts_liked_by_user.sql")
	if err != nil {
		return nil, err
	}

	filterPostsByCategory, err := myEmbed.QueryFiles.ReadFile("queries/filter_posts_by_category.sql")
	if err != nil {
		return nil, err
	}

	/**

	the from the prev comments we can make this change
	key := strings.TrimSuffix(entry.Name(), ".sql")
		registry[key] = string(content)

	such that we dont have to do repetative work of assigning
	manualy to the struct fields, but for now, this is fine
	*/

	return &Queries{
		CreatUser:             string(creatUser),
		CreatPost:             string(creatPost),
		CreatComment:          string(creatComment),
		CreatSession:          string(creatSession),
		InitializeDB:          string(initializeDB),
		SeedCategories:        string(seedCategories),
		AddPostCategory:       string(addPostCategory),
		GetPosts:              string(getPosts),
		GetUserPosts:          string(getUserPosts),
		GetPostComments:       string(getPostComments),
		GetUserByEmail:        string(getUserByEmail),
		GetSessionByToken:     string(getSessionByToken),
		DeleteSessionByToken:  string(deleteSessionByToken),
		ReactToPost:           string(reactToPost),
		GetPostReactions:      string(getPostReactions),
		GetLikedPosts:         string(getLikedPosts),
		FilterPostsByCategory: string(filterPostsByCategory),
	}, nil
}

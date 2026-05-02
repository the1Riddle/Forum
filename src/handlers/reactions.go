package handlers

import (
	"net/http"
	"forum/src/data"
	"strconv"
)

// React handles like/dislike reactions for posts and comments.
func (h *Handler) React(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		BackToHome(w, r)
		return
	}

	user := h.currentUser(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	
	reactToWhat := r.FormValue("target_type")
	whichId := r.FormValue("target_id")
	whatReaction := r.FormValue("type")
	postId := r.FormValue("post_id")

	targetId, err := strconv.Atoi(whichId)

	if err != nil {
		BackToHome(w, r)
		return
	}

	if whatReaction != "like" && whatReaction != "dislike" {
		BackToHome(w, r)
		return
	}

	switch reactToWhat {
	case "post":
		data.ReactToPost(h.DB, h.Queries, user.Id, targetId, whatReaction)
		http.Redirect(w, r, "/post?id="+whichId, http.StatusSeeOther)
	case "comment":
		data.ReactToComment(h.DB, h.Queries, user.Id, targetId, whatReaction)
		if postId != "" {
			http.Redirect(w, r, "/post?id="+postId, http.StatusSeeOther)
		} else {
			BackToHome(w, r)
		}
	default:
		BackToHome(w, r)
	}


}
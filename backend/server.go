package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"forum/pkg/db/sqlite"
	"forum/pkg/handlers"
	"forum/pkg/middleware"
	ws "forum/pkg/websocket"
)

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/forum.db"
	}

	os.MkdirAll("uploads", 0755)
	os.MkdirAll("data", 0755)

	db := sqlite.InitDB(dbPath)
	defer db.Close()

	authH := handlers.NewAuthHandler(db)
	profileH := handlers.NewProfileHandler(db)
	postH := handlers.NewPostHandler(db)
	commentH := handlers.NewCommentHandler(db)
	followerH := handlers.NewFollowerHandler(db)
	groupH := handlers.NewGroupHandler(db)
	notifH := handlers.NewNotificationHandler(db)
	reactionH := handlers.NewReactionHandler(db)
	hub := ws.NewHub(db)

	mux := http.NewServeMux()

	fileServer := http.FileServer(http.Dir("./uploads"))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fileServer))

	// Auth routes
	mux.HandleFunc("/api/auth/register", authH.Register)
	mux.HandleFunc("/api/auth/login", authH.Login)
	mux.HandleFunc("/api/auth/logout", middleware.AuthMiddleware(db, authH.Logout))
	mux.HandleFunc("/api/auth/me", middleware.AuthMiddleware(db, authH.Me))

	// Profile routes
	mux.HandleFunc("/api/profile", middleware.OptionalAuth(db, profileH.GetProfile))
	mux.HandleFunc("/api/profile/update", middleware.AuthMiddleware(db, profileH.UpdateProfile))
	mux.HandleFunc("/api/profile/toggle-privacy", middleware.AuthMiddleware(db, profileH.TogglePrivacy))

	// Post routes
	mux.HandleFunc("/api/posts", middleware.OptionalAuth(db, postH.GetPosts))
	mux.HandleFunc("/api/posts/create", middleware.AuthMiddleware(db, postH.CreatePost))
	mux.HandleFunc("/api/posts/get", middleware.OptionalAuth(db, postH.GetPost))

	// Comment routes
	mux.HandleFunc("/api/comments/add", middleware.AuthMiddleware(db, commentH.AddComment))

	// Reaction routes
	mux.HandleFunc("/api/reactions", middleware.AuthMiddleware(db, reactionH.React))

	// Follower routes
	mux.HandleFunc("/api/followers/request", middleware.AuthMiddleware(db, followerH.FollowRequest))
	mux.HandleFunc("/api/followers/accept", middleware.AuthMiddleware(db, followerH.AcceptFollow))
	mux.HandleFunc("/api/followers/decline", middleware.AuthMiddleware(db, followerH.DeclineFollow))
	mux.HandleFunc("/api/followers/unfollow", middleware.AuthMiddleware(db, followerH.Unfollow))
	mux.HandleFunc("/api/followers/pending", middleware.AuthMiddleware(db, followerH.GetPendingRequests))

	// Group routes
	mux.HandleFunc("/api/groups", middleware.OptionalAuth(db, groupH.GetGroups))
	mux.HandleFunc("/api/groups/create", middleware.AuthMiddleware(db, groupH.CreateGroup))
	mux.HandleFunc("/api/groups/get", middleware.OptionalAuth(db, groupH.GetGroup))
	mux.HandleFunc("/api/groups/invite", middleware.AuthMiddleware(db, groupH.InviteMember))
	mux.HandleFunc("/api/groups/join-request", middleware.AuthMiddleware(db, groupH.JoinRequest))
	mux.HandleFunc("/api/groups/accept-join", middleware.AuthMiddleware(db, groupH.AcceptJoin))
	mux.HandleFunc("/api/groups/decline-join", middleware.AuthMiddleware(db, groupH.DeclineJoin))
	mux.HandleFunc("/api/groups/accept-invite", middleware.AuthMiddleware(db, groupH.AcceptInvite))
	mux.HandleFunc("/api/groups/decline-invite", middleware.AuthMiddleware(db, groupH.DeclineInvite))
	mux.HandleFunc("/api/groups/post", middleware.AuthMiddleware(db, groupH.CreateGroupPost))
	mux.HandleFunc("/api/groups/event", middleware.AuthMiddleware(db, groupH.CreateEvent))
	mux.HandleFunc("/api/groups/event-respond", middleware.AuthMiddleware(db, groupH.RespondEvent))

	// Notification routes
	mux.HandleFunc("/api/notifications", middleware.AuthMiddleware(db, notifH.GetNotifications))
	mux.HandleFunc("/api/notifications/read", middleware.AuthMiddleware(db, notifH.MarkRead))
	mux.HandleFunc("/api/notifications/unread-count", middleware.AuthMiddleware(db, notifH.GetUnreadCount))

	// Chat routes
	mux.HandleFunc("/api/chat/history", func(w http.ResponseWriter, r *http.Request) {
		user := middleware.GetCurrentUser(r, db)
		if user == nil {
			middleware.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}
		ctx := context.WithValue(r.Context(), "user_id", user.ID)
		hub.GetChatHistory(w, r.WithContext(ctx))
	})

	// WebSocket
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		user := middleware.GetCurrentUser(r, db)
		if user == nil {
			middleware.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}
		hub.HandleWebSocket(w, r, user.ID)
	})

	// CORS middleware wrapper
	handler := corsMiddleware(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Trim trailing slash for specific routes to avoid redirects
		if r.URL.Path != "/" && strings.HasSuffix(r.URL.Path, "/") && r.URL.Path != "/uploads/" {
			http.Redirect(w, r, strings.TrimSuffix(r.URL.Path, "/"), http.StatusMovedPermanently)
			return
		}

		next.ServeHTTP(w, r)
	})
}

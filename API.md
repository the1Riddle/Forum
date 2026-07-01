# Forum Social Network API

Base URL: `http://localhost:8080/api`

All endpoints return JSON. Authentication uses HttpOnly cookies (`session_token`).

---

## Authentication

### POST /api/auth/register
Create a new account.

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "avatar": "",          // optional
  "nickname": "",        // optional
  "about_me": ""         // optional
}
```

**Response:** `201 Created` — `{ "message": "Registration successful" }`

---

### POST /api/auth/login
Login and receive session cookie.

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK` — Sets `session_token` cookie. Returns:
```json
{
  "message": "Login successful",
  "data": {
    "user": { "id": 1, "email": "...", "first_name": "...", "last_name": "...", "avatar": "...", "nickname": "..." }
  }
}
```

---

### POST /api/auth/logout
Logout (requires auth). Clears session cookie.

**Response:** `200 OK` — `{ "message": "Logged out successfully" }`

---

### GET /api/auth/me
Get current authenticated user info (requires auth).

**Response:** `200 OK` — User profile object with follower/following counts.

---

## Profile

### GET /api/profile?id={user_id}
Get a user's profile. If `id` is omitted, returns the current user's profile. Uses optional auth — unauthenticated users see only public profiles.

**Query params:** `id` (optional, integer)

**Response:** `200 OK`
```json
{
  "profile": { "id": 1, "email": "...", "first_name": "...", "last_name": "...", ... },
  "is_owner": false,
  "is_follower": false,
  "follow_status": "pending",      // "", "pending", "accepted"
  "private": false,               // true if profile is private and viewer can't see details
  "posts": [...],
  "followers": [...],
  "following": [...]
}
```

---

### PUT /api/profile/update
Update own profile (requires auth).

**Body (JSON):**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "avatar": "/uploads/avatar.jpg",
  "nickname": "johndoe",
  "about_me": "Hello world"
}
```

**Response:** `200 OK`

---

### POST /api/profile/toggle-privacy
Toggle profile between public and private (requires auth).

**Body (JSON):**
```json
{ "is_public": false }
```

**Response:** `200 OK`

---

## Posts

### GET /api/posts
Get all posts the user can view. Supports optional `?filter=my` or `?user_id=1`.

**Query params:** `filter=my` (show own posts), `user_id=1` (show specific user's posts)

**Response:** `200 OK` — Array of post objects with likes/dislikes/comment counts.

---

### GET /api/posts/get?id={post_id}
Get a single post with its comments.

**Response:** `200 OK`
```json
{
  "post": { ... },
  "comments": [ ... ]
}
```

---

### POST /api/posts/create
Create a new post (requires auth). Accepts JSON or multipart/form-data (for images).

**JSON body:**
```json
{
  "title": "My Post",
  "content": "Post content here",
  "privacy": "public",
  "image": "",                  // optional, image URL
  "allowed_users": [2, 3]       // required if privacy is "private"
}
```

**Multipart form fields:** `title`, `content`, `privacy`, `allowed_users` (comma-separated IDs), `image` (file)

**Privacy values:** `public` (everyone), `almost_private` (followers only), `private` (specific users)

**Response:** `201 Created` — `{ "message": "Post created", "data": { "id": 1 } }`

---

## Comments

### POST /api/comments/add
Add a comment to a post (requires auth). Accepts JSON or multipart/form-data.

**JSON body:**
```json
{
  "post_id": 1,
  "content": "Nice post!",
  "image": ""
}
```

**Multipart form fields:** `post_id`, `content`, `image` (file)

**Response:** `201 Created` — `{ "message": "Comment added" }`

---

## Reactions (Likes/Dislikes)

### POST /api/reactions
Like or dislike a post or comment (requires auth).

**Body (JSON):**
```json
{
  "target_type": "post",       // "post" or "comment"
  "target_id": 1,
  "reaction": "like"           // "like" or "dislike"
}
```

Toggles: sending the same reaction again removes it; sending the opposite reaction switches it.

**Response:** `200 OK` — `{ "message": "Reaction updated" }`

---

## Followers

### POST /api/followers/request
Send a follow request (requires auth).

**Body (JSON):**
```json
{ "followee_id": 2 }
```

If the target has a public profile, the follow is automatic. If private, a pending request is created.

**Response:** `200 OK` — `{ "message": "Follow request sent" }`

---

### POST /api/followers/accept?follower_id=2
Accept a follow request (requires auth — must be the followee).

**Query params:** `follower_id` (required)

**Response:** `200 OK`

---

### POST /api/followers/decline?follower_id=2
Decline a follow request.

**Query params:** `follower_id` (required)

**Response:** `200 OK`

---

### POST /api/followers/unfollow
Unfollow a user (requires auth).

**Body (JSON):**
```json
{ "followee_id": 2 }
```

**Response:** `200 OK`

---

### GET /api/followers/pending
Get pending follow requests for the current user (requires auth).

**Response:** `200 OK` — Array of follower request objects.

---

## Groups

### GET /api/groups
List all groups. If authenticated, includes user's role in each group.

**Response:** `200 OK` — Array of group objects.

---

### POST /api/groups/create
Create a new group (requires auth).

**Body (JSON):**
```json
{
  "title": "My Group",
  "description": "Group description"
}
```

**Response:** `201 Created` — `{ "message": "Group created", "data": { "id": 1 } }`

---

### GET /api/groups/get?id={group_id}
Get a single group with its members, posts, and events.

**Response:** `200 OK`
```json
{
  "group": { ... },
  "is_member": true,
  "members": [...],
  "posts": [...],
  "events": [...]
}
```

---

### POST /api/groups/invite
Invite a user to a group (requires auth — must be a member).

**Body (JSON):**
```json
{ "group_id": 1, "user_id": 2 }
```

**Response:** `200 OK`

---

### POST /api/groups/join-request
Request to join a group (requires auth).

**Body (JSON):**
```json
{ "group_id": 1 }
```

**Response:** `200 OK`

---

### POST /api/groups/accept-join?group_id=1&user_id=2
Accept a join request (requires auth — must be group creator).

**Query params:** `group_id`, `user_id`

**Response:** `200 OK`

---

### POST /api/groups/decline-join?group_id=1&user_id=2
Decline a join request (requires auth — must be group creator).

**Response:** `200 OK`

---

### POST /api/groups/accept-invite
Accept a group invitation (requires auth).

**Body (JSON):**
```json
{ "group_id": 1 }
```

**Response:** `200 OK`

---

### POST /api/groups/decline-invite
Decline a group invitation (requires auth).

**Body (JSON):**
```json
{ "group_id": 1 }
```

**Response:** `200 OK`

---

### POST /api/groups/post
Create a post in a group (requires auth — must be a member). Accepts JSON or multipart/form-data.

**JSON body:**
```json
{
  "group_id": 1,
  "title": "Group Post",
  "content": "Post content",
  "image": ""
}
```

**Multipart form fields:** `group_id`, `title`, `content`, `image` (file)

**Response:** `201 Created`

---

### POST /api/groups/event
Create an event in a group (requires auth — must be a member).

**Body (JSON):**
```json
{
  "group_id": 1,
  "title": "Party",
  "description": "Fun party",
  "event_time": "2026-12-25T20:00:00Z"
}
```

**Response:** `201 Created`

---

### POST /api/groups/event-respond
Respond to a group event (requires auth).

**Body (JSON):**
```json
{
  "event_id": 1,
  "response": "going"        // "going" or "not_going"
}
```

**Response:** `200 OK`

---

## Notifications

### GET /api/notifications
Get latest 50 notifications for the current user (requires auth).

**Response:** `200 OK` — Array of notification objects with `type`, `from_name`, `group_title`, `is_read`, etc.

**Notification types:** `follow_request`, `follow_accepted`, `group_invite`, `group_join_request`, `group_event`, `group_join_accepted`

---

### POST /api/notifications/read?id={id}
Mark a notification as read. Pass `?id=all` to mark all as read.

**Query params:** `id` (notification ID or "all")

**Response:** `200 OK`

---

### GET /api/notifications/unread-count
Get unread notification count (requires auth).

**Response:** `200 OK` — `{ "unread_count": 5 }`

---

## Chat (WebSocket)

### WebSocket endpoint: `/ws`
Requires valid `session_token` cookie. Connect using browser WebSocket API.

**Message types:**

#### Send private message:
```json
{
  "type": "private_message",
  "payload": {
    "receiver_id": 2,
    "content": "Hello!"
  }
}
```

#### Send group message:
```json
{
  "type": "group_message",
  "payload": {
    "group_id": 1,
    "content": "Hey everyone!"
  }
}
```

#### Typing indicator:
```json
{
  "type": "typing",
  "payload": {
    "receiver_id": 2
  }
}
```

#### Receive private message:
```json
{
  "type": "private_message",
  "payload": {
    "sender_id": 2,
    "username": "Jane Doe",
    "avatar": "/uploads/avatar.jpg",
    "content": "Hello!",
    "receiver_id": 1,
    "created_at": "2026-07-01T12:00:00Z"
  }
}
```

#### Receive group message:
```json
{
  "type": "group_message",
  "payload": {
    "sender_id": 2,
    "username": "Jane Doe",
    "avatar": "/uploads/avatar.jpg",
    "content": "Hey everyone!",
    "group_id": 1,
    "created_at": "2026-07-01T12:00:00Z"
  }
}
```

### GET /api/chat/history?user_id=2
Get private chat history with a specific user (requires auth).

**Query params:** `user_id` (the other user's ID)

**Response:** `200 OK` — Array of message objects.

---

## Uploaded Files

Served statically at: `/uploads/{filename}`

Supported image types: JPEG, PNG, GIF

---

## Error Responses

All errors return:
```json
{ "error": "Description of what went wrong" }
```

Common HTTP status codes:
- `200` — Success
- `201` — Created
- `400` — Bad request (invalid input)
- `401` — Unauthorized (not logged in)
- `403` — Forbidden (no permission)
- `404` — Not found
- `409` — Conflict (duplicate, already exists)
- `500` — Internal server error

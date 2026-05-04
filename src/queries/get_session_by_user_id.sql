--get session by user id
SELECT id, user_id, expires_at FROM sessions WHERE user_id = ?;
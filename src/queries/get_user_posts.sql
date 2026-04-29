SELECT *
FROM posts
WHERE user_id = ?
ORDER BY created_at DESC;

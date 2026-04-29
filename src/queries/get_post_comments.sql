SELECT * FROM comments
WHERE post_id = ?
ORDER BY created_at ASC;
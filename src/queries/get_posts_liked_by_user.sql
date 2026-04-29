SELECT p.*
FROM posts p
JOIN reactions r ON r.post_id = p.id
WHERE r.user_id = ? AND r.type = 'like';
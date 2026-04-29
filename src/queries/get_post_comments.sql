SELECT c.id, c.user_id, c.post_id, c.content, c.created_at,
    u.username,
    COALESCE(SUM(CASE WHEN r.type = 'like' THEN 1 ELSE 0 END), 0) AS likes,
    COALESCE(SUM(CASE WHEN r.type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN reactions r ON r.comment_id = c.id
WHERE c.post_id = ?
GROUP BY c.id
ORDER BY c.created_at ASC;

SELECT p.id, p.user_id, p.title, p.content, p.created_at,
    u.username,
    COALESCE(SUM(CASE WHEN r2.type = 'like' THEN 1 ELSE 0 END), 0) AS likes,
    COALESCE(SUM(CASE WHEN r2.type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN reactions r ON r.post_id = p.id AND r.user_id = ? AND r.type = 'like'
LEFT JOIN reactions r2 ON r2.post_id = p.id
GROUP BY p.id
ORDER BY p.created_at DESC;

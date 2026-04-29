SELECT 
    p.id,
    p.title,
    p.content,
    p.created_at,
    u.username,
    SUM(CASE WHEN r.type = 'like' THEN 1 ELSE 0 END) AS likes,
    SUM(CASE WHEN r.type = 'dislike' THEN 1 ELSE 0 END) AS dislikes
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON r.post_id = p.id
GROUP BY p.id
ORDER BY p.created_at DESC;

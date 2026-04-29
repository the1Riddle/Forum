SELECT p.id, p.user_id, p.title, p.content, p.created_at,
    u.username,
    COALESCE(SUM(CASE WHEN r.type = 'like' THEN 1 ELSE 0 END), 0) AS likes,
    COALESCE(SUM(CASE WHEN r.type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN post_categories pc ON p.id = pc.post_id
JOIN categories c ON c.id = pc.category_id
LEFT JOIN reactions r ON r.post_id = p.id
WHERE c.name = ?
GROUP BY p.id
ORDER BY p.created_at DESC;

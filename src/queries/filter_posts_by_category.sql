SELECT p.*
FROM posts p
JOIN post_categories pc ON p.id = pc.post_id
JOIN categories c ON c.id = pc.category_id
WHERE c.name = ?
ORDER BY p.created_at DESC;

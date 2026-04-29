INSERT INTO reactions (user_id, post_id, comment_id, type)
VALUES (?, ?, ?, ?)
ON CONFLICT(user_id, post_id, comment_id)
DO UPDATE SET reaction_number = reaction_number + CASE WHEN excluded.type = 'like' THEN 1 ELSE -1 END,
              type = excluded.type;
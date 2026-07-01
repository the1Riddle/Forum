import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";

export type Post = {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  avatar?: string;
  title: string;
  content: string;
  image?: string;
  privacy: string;
  created_at: string;
  likes_count?: number;
  dislikes_count?: number;
  comments_count?: number;
};

export default function PostCard({ post }: { post: Post }) {
  const qc = useQueryClient();
  const react = useMutation({
    mutationFn: (reaction: "like" | "dislike") =>
      apiFetch("/reactions", {
        method: "POST",
        body: { target_type: "post", target_id: post.id, reaction },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const author = `${post.first_name ?? ""} ${post.last_name ?? ""}`.trim() || post.nickname || "Anon";

  return (
    <div className="card">
      <div className="card-header">
        <Link to={`/profile/${post.user_id}`} className="author">{author}</Link>
        <span className="date">{new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      <Link to={`/posts/${post.id}`} className="card-body-link">
        <h2 className="card-title">{post.title}</h2>
        <p className="card-content">{post.content}</p>
      </Link>
      {post.image && (
        <img src={post.image} alt="" className="card-img" />
      )}
      <div className="card-actions">
        <button onClick={() => react.mutate("like")} className="btn-icon">
          + {post.likes_count ?? 0}
        </button>
        <button onClick={() => react.mutate("dislike")} className="btn-icon">
          - {post.dislikes_count ?? 0}
        </button>
        <Link to={`/posts/${post.id}`} className="btn-icon">
          {post.comments_count ?? 0} comments
        </Link>
      </div>
    </div>
  );
}

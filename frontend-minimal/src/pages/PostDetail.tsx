import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import PostCard, { type Post } from "../components/PostCard";

type Comment = {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  content: string;
  created_at: string;
};

export default function PostDetail() {
  const { postId } = useParams();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => apiFetch<{ post: Post; comments: Comment[] }>(`/posts/get?id=${postId}`),
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: () => apiFetch("/comments/add", { method: "POST", body: { post_id: Number(postId), content: text.trim() } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  if (isLoading) return <p className="muted">Loading...</p>;
  if (isError) return <div className="error-msg">{(error as Error)?.message || "Post not found"}</div>;
  if (!data) return null;

  return (
    <div>
      <PostCard post={data.post} />
      <div className="card">
        <h3 className="card-title">{data.comments.length} Comments</h3>
        <div className="composer" style={{ flexDirection: "row" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment..." className="input" />
          <button onClick={() => text.trim() && addComment.mutate()} disabled={addComment.isPending} className="btn-primary">
            {addComment.isPending ? "..." : "Post"}
          </button>
        </div>
        {data.comments.map((c) => (
          <div key={c.id} className="comment">
            <Link to={`/profile/${c.user_id}`} className="comment-author">
              {c.first_name} {c.last_name}
            </Link>
            <p>{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { useAuth } from "../auth";
import PostCard, { type Post } from "../components/PostCard";

export default function Feed() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => apiFetch<Post[]>("/posts"),
  });

  const create = useMutation({
    mutationFn: () => apiFetch("/posts/create", { method: "POST", body: { title: title.trim(), content: content.trim(), privacy: "public" } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const prev = qc.getQueryData<Post[]>(["posts"]);
      if (!user) return;
      qc.setQueryData<Post[]>(["posts"], (old) => [
        {
          id: -Date.now(),
          user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          nickname: user.nickname,
          avatar: user.avatar,
          title: title.trim(),
          content: content.trim(),
          privacy: "public",
          created_at: new Date().toISOString(),
          likes_count: 0,
          dislikes_count: 0,
          comments_count: 0,
        },
        ...(old ?? []),
      ]);
      return { prev };
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(["posts"], (ctx as any).prev);
    },
  });

  return (
    <div>
      <h1 className="page-title">Feed</h1>
      <div className="composer">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="input"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="input"
        />
        <button
          onClick={() => title.trim() && content.trim() && create.mutate()}
          disabled={create.isPending}
          className="btn-primary"
        >
          {create.isPending ? "..." : "Post"}
        </button>
      </div>

      {isLoading && <p className="muted">Loading...</p>}
      {isError && <div className="error-msg">{(error as Error)?.message || "Failed to load posts"}</div>}
      {data?.length === 0 && <p className="muted">No posts yet.</p>}
      {data?.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

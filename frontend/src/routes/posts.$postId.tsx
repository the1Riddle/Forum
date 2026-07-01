import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, resolveAsset } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PostCard, type Post } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/posts/$postId")({
  component: PostPage,
});

type Comment = {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  content: string;
  image?: string;
  created_at: string;
};

function PostPage() {
  const { user, loading } = useAuth();
  const { postId } = useParams({ from: "/posts/$postId" });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => apiFetch<{ post: Post; comments: Comment[] }>(`/api/posts/get?id=${postId}`),
    retry: 1,
    staleTime: 30_000,
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <AppShell>
      {isLoading && <p className="uppercase text-sm">Loading…</p>}
      {isError && (
        <div className="brutalist-card p-10 text-center border-red-400">
          <p className="font-display text-xl uppercase text-red-500">Post not found</p>
          <p className="text-sm text-gray-500 mt-2">{(error as Error)?.message || "This post may have been removed."}</p>
        </div>
      )}
      {data && (
        <>
          <PostCard post={data.post} />
          <div className="brutalist-card p-6">
            <h3 className="font-display text-lg uppercase mb-4">
              {data.comments.length} Comments
            </h3>
            <CommentComposer postId={data.post.id} />
            <div className="mt-6 space-y-4">
              {data.comments.map((c) => (
                <div key={c.id} className="flex gap-3 pb-4 border-b border-gray-200 last:border-b-0">
                  <Avatar src={c.avatar} name={`${c.first_name ?? ""} ${c.last_name ?? ""}`} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase">
                      {c.first_name} {c.last_name}
                      <span className="text-gray-400 font-normal ml-2">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
                    {c.image && (
                      <img
                        src={resolveAsset(c.image)}
                        alt=""
                        className="mt-2 max-h-64 border-2 border-brand-black"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function CommentComposer({ postId }: { postId: number }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: async () => {
      if (file) {
        const fd = new FormData();
        fd.append("post_id", String(postId));
        fd.append("content", content);
        fd.append("image", file);
        return apiFetch("/api/comments/add", { method: "POST", body: fd });
      }
      return apiFetch("/api/comments/add", {
        method: "POST",
        body: { post_id: postId, content },
      });
    },
    onSuccess: () => {
      setContent("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["post", String(postId)] });
      toast.success("Comment added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) return;
        add.mutate();
      }}
      className="space-y-2"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Reply…"
        rows={2}
        className="w-full brutalist-input text-sm"
      />
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold uppercase cursor-pointer">
          {file ? file.name : "+ Image"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button disabled={add.isPending} className="brutalist-btn bg-brand-acid px-4 py-1 font-display text-xs uppercase" style={{ background: "var(--brand-acid)" }}>
          Post
        </button>
      </div>
    </form>
  );
}

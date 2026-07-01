import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, resolveAsset } from "@/lib/api";
import { Avatar } from "./Avatar";

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
  group_id?: number;
  group_title?: string;
};

export function PostCard({ post }: { post: Post }) {
  const qc = useQueryClient();
  const react = useMutation({
    mutationFn: (reaction: "like" | "dislike") =>
      apiFetch("/api/reactions", {
        method: "POST",
        body: { target_type: "post", target_id: post.id, reaction },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
  const author = `${post.first_name ?? ""} ${post.last_name ?? ""}`.trim() || post.nickname || "Anon";
  const img = resolveAsset(post.image);

  return (
    <article className="brutalist-card overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/profile/$userId" params={{ userId: String(post.user_id) }}>
            <Avatar src={post.avatar} name={author} size={40} />
          </Link>
          <div>
            <p className="font-bold uppercase text-sm">
              <Link to="/profile/$userId" params={{ userId: String(post.user_id) }}>
                {author}
              </Link>
              <span className="text-gray-400 font-normal ml-2">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </p>
            <p className="text-xs text-brand-orange font-bold uppercase">
              {post.group_title ? `in #${post.group_title}` : post.privacy}
            </p>
          </div>
        </div>
        <Link to="/posts/$postId" params={{ postId: String(post.id) }} className="block group">
          <h2 className="font-display text-2xl uppercase mb-3 group-hover:text-brand-orange transition-colors">
            {post.title}
          </h2>
          <p className="text-base mb-6 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </Link>
        {img && (
          <img
            src={img}
            alt=""
            className="w-full aspect-video object-cover border-2 border-brand-black mb-6 bg-gray-100"
          />
        )}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => react.mutate("like")}
              className="size-8 border-2 border-brand-black flex items-center justify-center bg-brand-acid font-bold"
              style={{ background: "var(--brand-acid)" }}
            >
              +
            </button>
            <span className="font-bold">{post.likes_count ?? 0}</span>
            <button
              onClick={() => react.mutate("dislike")}
              className="size-8 border-2 border-brand-black flex items-center justify-center bg-white font-bold"
            >
              −
            </button>
            <span className="font-bold text-gray-500">{post.dislikes_count ?? 0}</span>
          </div>
          <Link
            to="/posts/$postId"
            params={{ postId: String(post.id) }}
            className="text-xs font-bold uppercase underline decoration-2 underline-offset-4"
          >
            {post.comments_count ?? 0} Comments
          </Link>
        </div>
      </div>
    </article>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Post } from "./PostCard";

type Privacy = "public" | "almost_private" | "private";

export function PostComposer({ groupId }: { groupId?: number }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [allowed, setAllowed] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      const endpoint = groupId ? "/api/groups/post" : "/api/posts/create";
      if (file) {
        const fd = new FormData();
        fd.append("title", title);
        fd.append("content", content);
        if (groupId) fd.append("group_id", String(groupId));
        else {
          fd.append("privacy", privacy);
          if (privacy === "private") fd.append("allowed_users", allowed);
        }
        fd.append("image", file);
        return apiFetch(endpoint, { method: "POST", body: fd });
      }
      const body: Record<string, unknown> = { title, content };
      if (groupId) body.group_id = groupId;
      else {
        body.privacy = privacy;
        if (privacy === "private") {
          body.allowed_users = allowed
            .split(",")
            .map((s) => Number(s.trim()))
            .filter(Boolean);
        }
      }
      return apiFetch(endpoint, { method: "POST", body });
    },
    onMutate: async () => {
      if (groupId) return;
      await qc.cancelQueries({ queryKey: ["posts"] });
      const previous = qc.getQueryData<Post[]>(["posts"]);
      if (!user) return previous;
      const optimistic: Post = {
        id: -Date.now(),
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        nickname: user.nickname,
        avatar: user.avatar,
        title: title.trim(),
        content: content.trim(),
        privacy,
        created_at: new Date().toISOString(),
        likes_count: 0,
        dislikes_count: 0,
        comments_count: 0,
      };
      qc.setQueryData<Post[]>(["posts"], (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onSuccess: () => {
      toast.success("Posted");
      setTitle("");
      setContent("");
      setFile(null);
      setAllowed("");
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["posts"], ctx.previous);
      toast.error(e.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return toast.error("Title & content required");
        create.mutate();
      }}
      className="brutalist-card p-6 space-y-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — say it loud"
        className="w-full brutalist-input font-display text-lg uppercase"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's the signal today?"
        rows={3}
        className="w-full brutalist-input resize-y text-base"
      />
      {!groupId && (
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as Privacy)}
            className="brutalist-input text-xs font-bold uppercase"
          >
            <option value="public">Public</option>
            <option value="almost_private">Followers only</option>
            <option value="private">Specific users</option>
          </select>
          {privacy === "private" && (
            <input
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
              placeholder="User IDs, comma-separated"
              className="brutalist-input text-xs flex-1 min-w-[200px]"
            />
          )}
        </div>
      )}
      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
        <label className="text-xs font-bold uppercase flex items-center gap-2 cursor-pointer">
          <span className="size-4 bg-brand-acid border-2 border-brand-black block" style={{ background: "var(--brand-acid)" }}></span>
          {file ? file.name : "Add Image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          disabled={create.isPending}
          className="brutalist-btn bg-brand-acid px-8 py-2 font-display uppercase text-sm"
          style={{ background: "var(--brand-acid)" }}
        >
          {create.isPending ? "..." : "Broadcast"}
        </button>
      </div>
    </form>
  );
}

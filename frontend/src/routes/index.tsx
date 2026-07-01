import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PostCard, type Post } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/auth" />;
  return <Feed />;
}

function Feed() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => apiFetch<Post[]>("/api/posts"),
    retry: 1,
    staleTime: 30_000,
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl uppercase tracking-tighter">The Stream</h1>
      <PostComposer />
      {isLoading && <p className="text-sm uppercase tracking-widest text-gray-500">Loading…</p>}
      {isError && (
        <div className="brutalist-card p-10 text-center border-red-400">
          <p className="font-display text-xl uppercase text-red-500">Connection lost</p>
          <p className="text-sm text-gray-500 mt-2">{(error as Error)?.message || "Could not load posts. Check your connection."}</p>
        </div>
      )}
      {!isLoading && !isError && data?.length === 0 && (
        <div className="brutalist-card p-10 text-center">
          <p className="font-display text-xl uppercase">Silence.</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to broadcast.</p>
        </div>
      )}
      {!isLoading && data?.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </AppShell>
  );
}

function FullLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-brand-surface">
      <p className="font-display text-2xl uppercase tracking-tighter">Loading signals…</p>
    </div>
  );
}

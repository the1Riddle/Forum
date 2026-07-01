import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth, type User } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PostCard, type Post } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/profile/$userId")({
  component: ProfilePage,
});

type ProfileResp = {
  profile: User;
  is_owner: boolean;
  is_follower: boolean;
  follow_status: "" | "pending" | "accepted";
  private: boolean;
  posts: Post[];
  followers: User[];
  following: User[];
};

function ProfilePage() {
  const { user, loading } = useAuth();
  const { userId } = useParams({ from: "/profile/$userId" });
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => apiFetch<ProfileResp>(`/api/profile?id=${userId}`),
    retry: 1,
    staleTime: 30_000,
  });

  const followMut = useMutation({
    mutationFn: () =>
      apiFetch("/api/followers/request", { method: "POST", body: { followee_id: Number(userId) } }),
    onSuccess: () => {
      toast.success("Sent");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
  const unfollowMut = useMutation({
    mutationFn: () =>
      apiFetch("/api/followers/unfollow", { method: "POST", body: { followee_id: Number(userId) } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <AppShell>
      {isLoading && <p className="uppercase text-sm">Loading…</p>}
      {isError && (
        <div className="brutalist-card p-10 text-center border-red-400">
          <p className="font-display text-xl uppercase text-red-500">User not found</p>
          <p className="text-sm text-gray-500 mt-2">{(error as Error)?.message || "This profile may not exist."}</p>
        </div>
      )}
      {!isLoading && !isError && data && (
        <>
          <div className="brutalist-card p-8">
            <div className="flex items-start gap-6">
              <Avatar src={data.profile.avatar} name={`${data.profile.first_name} ${data.profile.last_name}`} size={96} />
              <div className="flex-1">
                <h1 className="font-display text-3xl uppercase tracking-tighter">
                  {data.profile.first_name} {data.profile.last_name}
                </h1>
                <p className="text-sm text-gray-500">@{data.profile.nickname || data.profile.email.split("@")[0]}</p>
                {data.profile.about_me && <p className="mt-3 text-sm">{data.profile.about_me}</p>}
                <div className="mt-4 flex gap-6 text-xs font-bold uppercase">
                  <span>{data.followers.length} Followers</span>
                  <span>{data.following.length} Following</span>
                  <span>{data.posts.length} Posts</span>
                </div>
              </div>
              {!data.is_owner && (
                <div>
                  {data.follow_status === "accepted" || data.is_follower ? (
                    <button
                      onClick={() => unfollowMut.mutate()}
                      className="brutalist-btn bg-white px-4 py-2 font-display text-xs uppercase"
                    >
                      Unfollow
                    </button>
                  ) : data.follow_status === "pending" ? (
                    <button disabled className="brutalist-btn bg-gray-100 px-4 py-2 font-display text-xs uppercase">
                      Pending
                    </button>
                  ) : (
                    <button
                      onClick={() => followMut.mutate()}
                      className="brutalist-btn bg-brand-acid px-4 py-2 font-display text-xs uppercase"
                      style={{ background: "var(--brand-acid)" }}
                    >
                      Follow
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {data.private ? (
            <div className="brutalist-card p-10 text-center">
              <p className="font-display text-xl uppercase">This profile is private.</p>
              <p className="text-sm text-gray-500 mt-2">Request to follow to see posts.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.posts.length === 0 && (
                <div className="brutalist-card p-6 text-center text-sm text-gray-500 uppercase">No posts yet.</div>
              )}
              {data.posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

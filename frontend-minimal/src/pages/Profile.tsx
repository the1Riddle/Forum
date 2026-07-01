import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { useAuth, type User } from "../auth";
import PostCard, { type Post } from "../components/PostCard";

type ProfileResp = {
  profile: User;
  is_owner: boolean;
  is_follower: boolean;
  follow_status: "" | "pending" | "accepted";
  private?: boolean;
  posts: Post[];
};

export default function Profile() {
  const { user } = useAuth();
  const { userId } = useParams();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => apiFetch<ProfileResp>(`/profile?id=${userId}`),
    enabled: !!userId,
  });

  const follow = useMutation({
    mutationFn: () => apiFetch("/followers/request", { method: "POST", body: { followee_id: Number(userId) } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });

  const unfollow = useMutation({
    mutationFn: () => apiFetch("/followers/unfollow", { method: "POST", body: { followee_id: Number(userId) } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });

  if (isLoading) return <p className="muted">Loading...</p>;
  if (isError) return <div className="error-msg">{(error as Error)?.message || "User not found"}</div>;
  if (!data) return null;

  const p = data.profile;

  return (
    <div>
      <div className="card">
        <div className="profile-header">
          <div>
            <h1 className="page-title">{p.first_name} {p.last_name}</h1>
            <p className="muted">@{p.nickname || p.email?.split("@")[0]}</p>
            {p.about_me && <p>{p.about_me}</p>}
          </div>
          {!data.is_owner && (
            <div>
              {data.follow_status === "accepted" || data.is_follower ? (
                <button onClick={() => unfollow.mutate()} className="btn-outline">Unfollow</button>
              ) : data.follow_status === "pending" ? (
                <button disabled className="btn-outline">Pending</button>
              ) : (
                <button onClick={() => follow.mutate()} className="btn-primary">Follow</button>
              )}
            </div>
          )}
        </div>
        <div className="stats">
          <span>{(data as any).followers?.length ?? 0} followers</span>
          <span>{(data as any).following?.length ?? 0} following</span>
          <span>{data.posts.length} posts</span>
        </div>
      </div>
      {data.private ? (
        <p className="muted">This profile is private.</p>
      ) : (
        data.posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </div>
  );
}

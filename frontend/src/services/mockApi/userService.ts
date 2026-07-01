import { apiRequest } from "../apiClient";
import { adaptFollower, adaptUser, deriveFollowState, knownUsersCache } from "../adapter";
import type { FollowState, User } from "@/types";

export const userCache = knownUsersCache;

export async function getUser(id: string): Promise<User> {
  if (knownUsersCache.has(id)) return knownUsersCache.get(id)!;
  const raw = await apiRequest<any>(`/api/profile?id=${id}`);
  const profile = raw.profile || raw;
  const user = adaptUser(profile);
  knownUsersCache.set(user.id, user);
  return user;
}

export async function listUsers(_query?: string): Promise<User[]> {
  return [];
}

if (typeof window !== "undefined") {
  listUsers().catch(() => {});
}

export async function suggested(_limit = 5): Promise<User[]> {
  return [];
}

export async function getFollowState(id: string): Promise<FollowState> {
  const raw = await apiRequest<any>(`/api/profile?id=${id}`);
  const followStatus: string | undefined = raw.follow_status;
  const isFollower: boolean | undefined = raw.is_follower;
  let hasReversePending = false;
  try {
    const pending = await apiRequest<any[]>("/api/followers/pending");
    hasReversePending = (pending || []).some((r: any) => String(r.follower_id) === id);
  } catch {}
  return deriveFollowState(followStatus, isFollower, hasReversePending);
}

export async function follow(id: string): Promise<FollowState> {
  await apiRequest("/api/followers/request", {
    method: "POST",
    body: JSON.stringify({ followee_id: Number(id) }),
  });
  return "following";
}

export async function unfollow(id: string): Promise<FollowState> {
  await apiRequest("/api/followers/unfollow", {
    method: "POST",
    body: JSON.stringify({ followee_id: Number(id) }),
  });
  return "not_following";
}

export async function cancelRequest(id: string): Promise<FollowState> {
  await apiRequest("/api/followers/unfollow", {
    method: "POST",
    body: JSON.stringify({ followee_id: Number(id) }),
  });
  return "not_following";
}

export async function listFollowers(id: string): Promise<User[]> {
  const raw = await apiRequest<any>(`/api/profile?id=${id}`);
  const followers = raw.followers || [];
  return followers.map(adaptFollower);
}

export async function listFollowing(id: string): Promise<User[]> {
  const raw = await apiRequest<any>(`/api/profile?id=${id}`);
  const following = raw.following || [];
  return following.map(adaptFollower);
}

export async function toggleProfilePrivacy(isPrivate: boolean): Promise<{ ok: boolean }> {
  await apiRequest("/api/profile/toggle-privacy", {
    method: "POST",
    body: JSON.stringify({ is_public: !isPrivate }),
  });
  return { ok: true };
}

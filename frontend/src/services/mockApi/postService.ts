import { apiRequest } from "../apiClient";
import { adaptComment, adaptPost, adaptUser, knownUsersCache } from "../adapter";
import type { Comment, Post, User } from "@/types";

export async function feed(_sort?: "latest" | "top"): Promise<Post[]> {
  const raw = await apiRequest<any[]>("/api/posts");
  return (raw || []).map(adaptPost);
}

export async function userPosts(userId: string): Promise<Post[]> {
  const raw = await apiRequest<any[]>(`/api/posts?user_id=${userId}`);
  return (raw || []).map(adaptPost);
}

export async function getPost(id: string): Promise<Post> {
  const raw = await apiRequest<any>(`/api/posts/get?id=${id}`);
  return adaptPost(raw.post || raw);
}

export async function createPost(input: { text: string; image?: string; privacy?: string; groupId?: string; allowedFollowers?: string[] }): Promise<Post> {
  const body: any = {
    title: input.text?.split("\n")[0]?.slice(0, 100) || "Post",
    content: input.text || "",
    privacy: input.privacy === "followers" ? "almost_private" : (input.privacy || "public"),
    image: input.image || "",
  };
  if (body.privacy === "private" && input.allowedFollowers?.length) {
    body.allowed_users = input.allowedFollowers.map(Number);
  }
  const res = await apiRequest<any>("/api/posts/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.data?.id) {
    return { ...input, id: String(res.data.id), authorId: "", createdAt: new Date().toISOString(), likes: 0, comments: 0, shares: 0 } as Post;
  }
  throw new Error("Failed to create post");
}

export async function toggleLike(id: string): Promise<Post> {
  await apiRequest("/api/reactions", {
    method: "POST",
    body: JSON.stringify({ target_type: "post", target_id: Number(id), reaction: "like" }),
  });
  return { id } as Post;
}

export async function toggleSave(_id: string): Promise<Post> {
  throw new Error("Save not supported");
}

export async function postComments(postId: string): Promise<Comment[]> {
  const raw = await apiRequest<any>(`/api/posts/get?id=${postId}`);
  const comments = raw.comments || [];
  return comments.map(adaptComment);
}

export async function addComment(postId: string, text: string, _parentId?: string, _image?: string): Promise<Comment> {
  const res = await apiRequest<any>("/api/comments/add", {
    method: "POST",
    body: JSON.stringify({ post_id: Number(postId), content: text }),
  });
  return { id: res.data?.id || "0", postId, authorId: "", text, createdAt: new Date().toISOString(), likes: 0 } as Comment;
}

export async function getAuthor(id: string): Promise<User> {
  if (knownUsersCache.has(id)) return knownUsersCache.get(id)!;
  const raw = await apiRequest<any>(`/api/profile?id=${id}`);
  const profile = raw.profile || raw;
  const user = adaptUser(profile);
  knownUsersCache.set(user.id, user);
  return user;
}

export async function getSavedPosts(): Promise<Post[]> {
  return [];
}

export async function toggleCommentLike(commentId: string): Promise<{ ok: boolean }> {
  await apiRequest("/api/reactions", {
    method: "POST",
    body: JSON.stringify({ target_type: "comment", target_id: Number(commentId), reaction: "like" }),
  });
  return { ok: true };
}

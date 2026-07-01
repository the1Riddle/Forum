import { apiRequest } from "../apiClient";
import { adaptGroup, adaptGroupMember, adaptGroupPost, adaptGroupEvent } from "../adapter";
import type { EventItem, Group, Post, User } from "@/types";

export async function list(_filter?: string): Promise<Group[]> {
  const raw = await apiRequest<any[]>("/api/groups");
  return (raw || []).map(adaptGroup);
}

export async function get(id: string): Promise<Group> {
  const raw = await apiRequest<any>(`/api/groups/get?id=${id}`);
  const group = adaptGroup(raw.group || raw);
  const role = (raw.group && raw.group.role) || raw.role;
  if (role === "creator") {
    group.membership = "owner";
  } else if (role) {
    group.membership = "member";
  } else if (raw.is_member) {
    group.membership = "member";
  }
  return group;
}

export async function join(id: string): Promise<Group> {
  await apiRequest("/api/groups/join-request", {
    method: "POST",
    body: JSON.stringify({ group_id: Number(id) }),
  });
  return { id } as Group;
}

export async function leave(_id: string): Promise<Group> {
  throw new Error("Leave group not supported");
}

export async function invite(id: string, userId: string): Promise<void> {
  await apiRequest("/api/groups/invite", {
    method: "POST",
    body: JSON.stringify({ group_id: Number(id), user_id: Number(userId) }),
  });
}

export async function createGroup(name: string, description: string): Promise<Group> {
  const res = await apiRequest<any>("/api/groups/create", {
    method: "POST",
    body: JSON.stringify({ title: name, description }),
  });
  return { id: String(res.data?.id || ""), name, description } as Group;
}

export async function getPosts(id: string): Promise<Post[]> {
  const raw = await apiRequest<any>(`/api/groups/get?id=${id}`);
  const posts = raw.posts || [];
  return posts.map(adaptGroupPost);
}

export async function getMembers(id: string): Promise<(User & { role: string })[]> {
  const raw = await apiRequest<any>(`/api/groups/get?id=${id}`);
  const members = raw.members || [];
  return members.map(adaptGroupMember);
}

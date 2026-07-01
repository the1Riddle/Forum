import { apiRequest } from "../apiClient";
import { adaptNotification } from "../adapter";
import type { Notification } from "@/types";

export async function list(_filter?: string): Promise<Notification[]> {
  const raw = await apiRequest<any[]>("/api/notifications");
  return (raw || []).map(adaptNotification);
}

export async function markAllRead(): Promise<boolean> {
  await apiRequest("/api/notifications/read?id=all", {
    method: "POST",
  });
  return true;
}

export async function markRead(id: string): Promise<Notification> {
  await apiRequest(`/api/notifications/read?id=${id}`, {
    method: "POST",
  });
  return { id } as Notification;
}

export async function unreadCount(): Promise<number> {
  const res = await apiRequest<{ unread_count: number }>("/api/notifications/unread-count");
  return res.unread_count;
}

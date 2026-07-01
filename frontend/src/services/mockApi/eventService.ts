import { apiRequest } from "../apiClient";
import { adaptGroupEvent } from "../adapter";
import type { EventItem } from "@/types";

export async function list(_filter?: string, groupId?: string): Promise<EventItem[]> {
  if (groupId) {
    const raw = await apiRequest<any>(`/api/groups/get?id=${groupId}`);
    const events = raw.events || [];
    return events.map(adaptGroupEvent);
  }
  return [];
}

export async function createEvent(
  groupId: string,
  payload: { title: string; description: string; startsAt: string; endsAt: string; location: string; online: boolean }
): Promise<EventItem> {
  await apiRequest("/api/groups/event", {
    method: "POST",
    body: JSON.stringify({
      group_id: Number(groupId),
      title: payload.title,
      description: payload.description,
      event_time: payload.startsAt,
    }),
  });
  return {} as EventItem;
}

export async function toggleGoing(id: string): Promise<EventItem> {
  await apiRequest("/api/groups/event-respond", {
    method: "POST",
    body: JSON.stringify({ event_id: Number(id), response: "going" }),
  });
  return { id } as EventItem;
}

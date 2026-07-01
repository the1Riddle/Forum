import { apiRequest } from "../apiClient";
import { wsManager } from "../websocket";
import { knownUsersCache } from "../adapter";
import type { Conversation, Message, User } from "@/types";

type Listener = (msg: Message) => void;

export async function listConversations(): Promise<Conversation[]> {
  return [];
}

export async function getConversation(id: string): Promise<Conversation> {
  const user = knownUsersCache.get(id);
  return {
    id,
    kind: "dm",
    participantIds: [id],
    title: user?.name || "User",
    icon: user?.avatar,
    unread: 0,
  };
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const raw = await apiRequest<any[]>(`/api/chat/history?user_id=${conversationId}`);
  return (raw || []).map((m: any) => ({
    id: String(m.id),
    conversationId,
    authorId: String(m.sender_id),
    text: m.content || "",
    createdAt: m.created_at,
    seen: undefined,
    attachment: undefined,
  }));
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
  if (wsManager.isConnected()) {
    wsManager.sendRaw({
      type: "private_message",
      payload: { receiver_id: Number(conversationId), content: text },
    });
  }
  return {
    id: "temp_" + Date.now(),
    conversationId,
    authorId: "",
    text,
    createdAt: new Date().toISOString(),
  } as Message;
}

export async function startConversation(_kind: "dm" | "group", participantIds: string[], _title?: string): Promise<Conversation> {
  const otherId = participantIds[0] || "";
  const user = knownUsersCache.get(otherId);
  return {
    id: otherId,
    kind: "dm",
    participantIds: [otherId],
    title: user?.name || "User",
    icon: user?.avatar,
    unread: 0,
  };
}

export function subscribe(conversationId: string, fn: Listener) {
  return wsManager.subscribe((payload) => {
    if (payload.type === "message") {
      const data = payload.data;
      if (data.conversationId === conversationId || data.authorId === conversationId) {
        fn(data);
      }
    }
  });
}

export function getParticipants(c: Conversation): User[] {
  return c.participantIds.map((id) => {
    const cached = knownUsersCache.get(id);
    if (cached) return cached;
    return {
      id,
      name: "Fakebook User",
      handle: "user_" + id.slice(0, 4),
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + id,
      isPrivate: false,
      followers: 0,
      following: 0,
      joinedAt: new Date().toISOString(),
    } as User;
  });
}

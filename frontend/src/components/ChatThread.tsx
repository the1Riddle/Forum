import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { socialWs, type WsMessage } from "@/lib/ws";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./Avatar";

type Message = {
  sender_id: number;
  receiver_id?: number;
  group_id?: number;
  username?: string;
  avatar?: string;
  content: string;
  created_at: string;
};

export function ChatThread({
  peerId,
  groupId,
  title,
}: {
  peerId?: number;
  groupId?: number;
  title: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: history } = useQuery({
    queryKey: ["chat", peerId ?? `group-${groupId}`],
    queryFn: async () => {
      if (peerId) return apiFetch<Message[]>(`/api/chat/history?user_id=${peerId}`);
      return [] as Message[];
    },
    enabled: !!peerId,
  });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    socialWs.connect();
    const off = socialWs.subscribe((msg: WsMessage) => {
      if (msg.type === "typing" && peerId && msg.payload.sender_id === peerId) {
        setTyping(true);
        setTimeout(() => setTyping(false), 2000);
      }
      if (msg.type === "private_message" && peerId) {
        const p = msg.payload;
        if (
          (p.sender_id === peerId && p.receiver_id === user?.id) ||
          (p.sender_id === user?.id && p.receiver_id === peerId)
        ) {
          setMessages((m) => [...m, p]);
        }
      }
      if (msg.type === "group_message" && groupId && msg.payload.group_id === groupId) {
        setMessages((m) => [...m, msg.payload]);
      }
    });
    return () => off();
  }, [peerId, groupId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    if (!input.trim()) return;
    if (peerId) {
      socialWs.send({ type: "private_message", payload: { receiver_id: peerId, content: input } as never });
      setMessages((m) => [
        ...m,
        {
          sender_id: user!.id,
          receiver_id: peerId,
          content: input,
          created_at: new Date().toISOString(),
        },
      ]);
    } else if (groupId) {
      socialWs.send({ type: "group_message", payload: { group_id: groupId, content: input } as never });
      setMessages((m) => [
        ...m,
        {
          sender_id: user!.id,
          group_id: groupId,
          content: input,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setInput("");
  };

  const onType = () => {
    if (peerId) socialWs.send({ type: "typing", payload: { receiver_id: peerId } });
  };

  return (
    <div className="brutalist-card overflow-hidden flex flex-col h-[70vh]">
      <div className="bg-brand-black text-white p-4 flex items-center justify-between" style={{ background: "var(--brand-black)", color: "white" }}>
        <div>
          <p className="font-display text-lg uppercase tracking-tighter">{title}</p>
          {typing && <p className="text-[10px] text-brand-acid animate-pulse">typing…</p>}
        </div>
        <span className="size-2 bg-green-400 rounded-full" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-brand-surface" style={{ background: "var(--brand-surface)" }}>
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-500 uppercase">No messages yet. Say hi.</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={i} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <Avatar src={m.avatar} name={m.username} size={28} />}
              <div className={`max-w-[75%] p-3 border-2 border-brand-black ${mine ? "bg-brand-acid" : "bg-white"}`} style={mine ? { background: "var(--brand-acid)" } : undefined}>
                {!mine && m.username && <p className="text-[10px] font-bold uppercase mb-1">{m.username}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <p className="text-[9px] text-gray-500 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t-2 border-brand-black flex gap-2 bg-white"
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            onType();
          }}
          placeholder="Type a message…"
          className="flex-1 brutalist-input"
        />
        <button className="brutalist-btn bg-brand-orange text-white px-6 py-2 font-display uppercase text-sm" style={{ background: "var(--brand-orange)", color: "white" }}>
          Send
        </button>
      </form>
    </div>
  );
}

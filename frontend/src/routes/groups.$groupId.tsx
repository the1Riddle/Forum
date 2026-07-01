import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PostCard, type Post } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupPage,
});

type Member = { id: number; first_name: string; last_name: string; avatar?: string };
type Event = {
  id: number;
  title: string;
  description: string;
  event_time: string;
  going_count?: number;
  not_going_count?: number;
  user_response?: string;
};
type GroupResp = {
  group: { id: number; title: string; description: string; creator_id: number };
  is_member: boolean;
  members: Member[];
  posts: Post[];
  events: Event[];
};

function GroupPage() {
  const { user, loading } = useAuth();
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const qc = useQueryClient();
  const id = Number(groupId);
  const { data, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: () => apiFetch<GroupResp>(`/api/groups/get?id=${id}`),
  });

  const join = useMutation({
    mutationFn: () => apiFetch("/api/groups/join-request", { method: "POST", body: { group_id: id } }),
    onSuccess: () => {
      toast.success("Request sent");
      qc.invalidateQueries({ queryKey: ["group", id] });
    },
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  if (isLoading || !data) {
    return (
      <AppShell>
        <p className="uppercase text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="brutalist-card p-8">
        <p className="text-xs font-bold uppercase text-brand-orange">Group</p>
        <h1 className="font-display text-4xl uppercase tracking-tighter mt-1">{data.group.title}</h1>
        <p className="text-sm text-gray-600 mt-3">{data.group.description}</p>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex -space-x-2">
            {data.members.slice(0, 6).map((m) => (
              <Avatar key={m.id} src={m.avatar} name={`${m.first_name} ${m.last_name}`} size={36} />
            ))}
            <span className="ml-4 text-xs font-bold uppercase self-center">{data.members.length} members</span>
          </div>
          {!data.is_member && (
            <button onClick={() => join.mutate()} className="brutalist-btn bg-brand-acid px-4 py-2 font-display text-xs uppercase" style={{ background: "var(--brand-acid)" }}>
              Request to join
            </button>
          )}
          {data.is_member && (
            <a href={`#chat`} className="text-xs font-bold uppercase underline decoration-2">
              Open group chat →
            </a>
          )}
        </div>
      </div>

      {data.is_member && <EventComposer groupId={id} />}
      {data.events.length > 0 && (
        <div className="brutalist-card p-6">
          <h3 className="font-display text-lg uppercase mb-4">Events</h3>
          <div className="space-y-4">
            {data.events.map((e) => (
              <EventRow key={e.id} groupId={id} event={e} />
            ))}
          </div>
        </div>
      )}

      {data.is_member && <PostComposer groupId={id} />}
      {data.posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {data.posts.length === 0 && (
        <div className="brutalist-card p-6 text-center text-sm text-gray-500 uppercase">No group posts yet.</div>
      )}
    </AppShell>
  );
}

function EventComposer({ groupId }: { groupId: number }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [time, setTime] = useState("");
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () =>
      apiFetch("/api/groups/event", {
        method: "POST",
        body: { group_id: groupId, title, description: desc, event_time: new Date(time).toISOString() },
      }),
    onSuccess: () => {
      toast.success("Event created");
      setTitle("");
      setDesc("");
      setTime("");
      qc.invalidateQueries({ queryKey: ["group", groupId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title || !time) return toast.error("Title & time required");
        create.mutate();
      }}
      className="brutalist-card p-6 space-y-3"
    >
      <h3 className="font-display text-lg uppercase">New event</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full brutalist-input" />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className="w-full brutalist-input" />
      <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="w-full brutalist-input" />
      <button className="brutalist-btn bg-brand-orange text-white px-6 py-2 font-display uppercase text-sm" style={{ background: "var(--brand-orange)", color: "white" }}>
        Schedule
      </button>
    </form>
  );
}

function EventRow({ groupId, event }: { groupId: number; event: Event }) {
  const qc = useQueryClient();
  const respond = useMutation({
    mutationFn: (response: "going" | "not_going") =>
      apiFetch("/api/groups/event-respond", { method: "POST", body: { event_id: event.id, response } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", groupId] }),
  });
  return (
    <div className="border-l-4 border-brand-orange pl-4" style={{ borderColor: "var(--brand-orange)" }}>
      <p className="text-xs font-bold text-brand-orange">
        {new Date(event.event_time).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <p className="font-bold text-sm uppercase">{event.title}</p>
      {event.description && <p className="text-xs text-gray-600 mt-1">{event.description}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => respond.mutate("going")}
          className={`brutalist-btn px-3 py-1 font-display text-[10px] uppercase ${
            event.user_response === "going" ? "bg-brand-acid" : "bg-white"
          }`}
          style={event.user_response === "going" ? { background: "var(--brand-acid)" } : undefined}
        >
          Going {event.going_count ? `· ${event.going_count}` : ""}
        </button>
        <button
          onClick={() => respond.mutate("not_going")}
          className={`brutalist-btn px-3 py-1 font-display text-[10px] uppercase ${
            event.user_response === "not_going" ? "bg-brand-black text-white" : "bg-white"
          }`}
          style={event.user_response === "not_going" ? { background: "var(--brand-black)", color: "white" } : undefined}
        >
          Pass
        </button>
      </div>
    </div>
  );
}

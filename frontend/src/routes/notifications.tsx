import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type Notif = {
  id: number;
  type: string;
  from_name?: string;
  from_id?: number;
  group_title?: string;
  group_id?: number;
  is_read: boolean;
  created_at: string;
};

const LABELS: Record<string, string> = {
  follow_request: "wants to follow you",
  follow_accepted: "accepted your follow request",
  group_invite: "invited you to",
  group_join_request: "wants to join",
  group_event: "created an event in",
  group_join_accepted: "accepted your join request for",
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notif[]>("/api/notifications"),
    enabled: !!user,
  });
  const markAll = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read?id=all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
  });
  const markOne = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/notifications/read?id=${id}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl uppercase tracking-tighter">Alerts</h1>
        <button onClick={() => markAll.mutate()} className="brutalist-btn bg-white px-4 py-2 font-display text-xs uppercase">
          Mark all read
        </button>
      </div>
      <div className="brutalist-card p-2">
        {(data ?? []).length === 0 && (
          <p className="p-6 text-sm uppercase tracking-widest text-gray-500 text-center">Nothing yet.</p>
        )}
        <ul className="divide-y-2 divide-brand-black">
          {(data ?? []).map((n) => (
            <li
              key={n.id}
              onClick={() => !n.is_read && markOne.mutate(n.id)}
              className={`p-4 flex items-center gap-3 cursor-pointer ${n.is_read ? "bg-white" : "bg-brand-acid"}`}
              style={!n.is_read ? { background: "var(--brand-acid)" } : undefined}
            >
              <span className="text-[10px] font-bold uppercase text-brand-orange">
                {n.type.replace(/_/g, " ")}
              </span>
              <span className="text-sm flex-1">
                <b>{n.from_name ?? "Someone"}</b> {LABELS[n.type] ?? ""}{" "}
                {n.group_title && <b>#{n.group_title}</b>}
              </span>
              <span className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

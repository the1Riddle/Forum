import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth, type User } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/chat/")({
  component: ChatIndex,
});

type ProfileResp = {
  followers: User[];
  following: User[];
};

function ChatIndex() {
  const { user, loading } = useAuth();
  const { data } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => apiFetch<ProfileResp>("/api/profile"),
    enabled: !!user,
    staleTime: 30_000,
    retry: 0,
  });
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<Array<{ id: number; title: string; role?: string }>>("/api/groups"),
    staleTime: 30_000,
    retry: 0,
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const contacts = [
    ...(data?.followers ?? []),
    ...(data?.following ?? []),
  ].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);
  const memberGroups = (groups ?? []).filter((g) => g.role);

  return (
    <AppShell>
      <h1 className="font-display text-4xl uppercase tracking-tighter">Chat</h1>
      <div className="brutalist-card p-6">
        <h3 className="font-display text-lg uppercase mb-3">Direct</h3>
        {contacts.length === 0 && <p className="text-xs text-gray-500 uppercase">Follow people to start chatting.</p>}
        <ul className="divide-y divide-gray-200">
          {contacts.map((c) => (
            <li key={c.id}>
              <Link to="/chat/$peerId" params={{ peerId: String(c.id) }} className="flex items-center gap-3 py-3">
                <Avatar src={c.avatar} name={`${c.first_name} ${c.last_name}`} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-gray-500">@{c.nickname || c.email?.split("@")[0]}</p>
                </div>
                <span className="text-xs text-brand-orange font-bold">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="brutalist-card p-6">
        <h3 className="font-display text-lg uppercase mb-3">Groups</h3>
        {memberGroups.length === 0 && <p className="text-xs text-gray-500 uppercase">Join a group to chat.</p>}
        <ul className="divide-y divide-gray-200">
          {memberGroups.map((g) => (
            <li key={g.id}>
              <Link to="/chat/group/$groupId" params={{ groupId: String(g.id) }} className="flex items-center gap-3 py-3">
                <div className="size-10 bg-brand-orange border-2 border-brand-black" style={{ background: "var(--brand-orange)" }} />
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase">#{g.title}</p>
                </div>
                <span className="text-xs text-brand-orange font-bold">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

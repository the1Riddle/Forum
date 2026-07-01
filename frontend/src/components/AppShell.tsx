import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./Avatar";

const NAV = [
  { to: "/", label: "Feed" },
  { to: "/groups", label: "Groups" },
  { to: "/chat", label: "Chat" },
  { to: "/notifications", label: "Alerts" },
];

export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => apiFetch<{ unread_count: number }>("/api/notifications/unread-count"),
    refetchInterval: 20000,
    enabled: !!user,
    staleTime: 10_000,
    retry: 0,
  });

  return (
    <div className="min-h-screen bg-brand-surface text-brand-black">
      <nav className="sticky top-0 z-40 bg-white border-b-2 border-brand-black px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-10">
          <Link to="/" className="font-display text-3xl tracking-tighter font-extrabold uppercase italic">
            SOCIAL/<span className="text-brand-orange">FORUM</span>
          </Link>
          <div className="hidden md:flex gap-6 font-medium text-sm uppercase tracking-widest">
            {NAV.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={active ? "text-brand-orange" : "hover:text-brand-orange transition-colors"}
                >
                  {n.label}
                  {n.to === "/notifications" && (unread?.unread_count ?? 0) > 0 ? (
                    <span className="ml-1 inline-block bg-brand-orange text-white px-1.5 py-[1px] text-[10px] align-top">
                      {unread!.unread_count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <Link to="/profile/$userId" params={{ userId: String(user.id) }} className="flex items-center gap-2">
              <Avatar src={user.avatar} name={`${user.first_name} ${user.last_name}`} size={36} />
              <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">
                {user.nickname || user.first_name}
              </span>
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="brutalist-btn bg-white px-4 py-2 font-display text-xs uppercase"
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6">
        <aside className="lg:col-span-3 space-y-6">
          <LeftRail />
        </aside>
        <main className="lg:col-span-6 space-y-8">{children}</main>
        <aside className="lg:col-span-3 space-y-6">{right ?? <RightRail />}</aside>
      </div>
    </div>
  );
}

function LeftRail() {
  const { user } = useAuth();
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<Array<{ id: number; title: string }>>("/api/groups"),
    staleTime: 30_000,
    retry: 0,
  });
  if (!user) return null;
  return (
    <>
      <div className="brutalist-card p-6">
        <Avatar src={user.avatar} name={`${user.first_name} ${user.last_name}`} size={80} className="mb-4" />
        <h2 className="font-display text-xl uppercase">
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-sm text-gray-500 mb-4">@{user.nickname || user.email.split("@")[0]}</p>
        <div className="flex justify-between text-xs font-bold uppercase border-t-2 border-brand-black pt-4">
          <div>
            {user.followers_count ?? 0} <span className="text-gray-400">Followers</span>
          </div>
          <div>
            {user.following_count ?? 0} <span className="text-gray-400">Following</span>
          </div>
        </div>
        <Link
          to="/settings"
          className="mt-4 block text-center brutalist-btn bg-brand-acid py-2 font-display text-xs uppercase"
        >
          Edit Profile
        </Link>
      </div>
      <div className="brutalist-card bg-brand-acid p-6" style={{ background: "var(--brand-acid)" }}>
        <h3 className="font-display text-lg uppercase mb-4">Groups</h3>
        <ul className="space-y-2 font-medium text-sm">
          {(groups ?? []).slice(0, 6).map((g) => (
            <li key={g.id}>
              <Link
                to="/groups/$groupId"
                params={{ groupId: String(g.id) }}
                className="underline decoration-2 hover:text-brand-orange"
              >
                # {g.title}
              </Link>
            </li>
          ))}
          {!groups?.length && <li className="text-xs text-brand-black/70">No groups yet.</li>}
          <li>
            <Link to="/groups" className="text-xs font-bold uppercase mt-2 inline-block">
              → Browse all
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}

function RightRail() {
  const { data: pending } = useQuery({
    queryKey: ["followers", "pending"],
    queryFn: () => apiFetch<Array<{ id: number; first_name: string; last_name: string; avatar?: string }>>("/api/followers/pending"),
    staleTime: 15_000,
    retry: 0,
  });
  return (
    <>
      <div className="brutalist-card p-6">
        <h3 className="font-display text-lg uppercase mb-4">Follow Requests</h3>
        {(pending ?? []).length === 0 && (
          <p className="text-xs text-gray-500 uppercase tracking-widest">All quiet.</p>
        )}
        <div className="space-y-3">
          {(pending ?? []).map((p) => (
            <FollowRequestRow key={p.id} user={p} />
          ))}
        </div>
      </div>
      <div className="brutalist-card bg-brand-black text-white p-4 sticky top-28" style={{ background: "var(--brand-black)", color: "white" }}>
        <h3 className="font-display text-sm uppercase tracking-tighter mb-3 text-brand-acid">Direct Signals</h3>
        <Link to="/chat" className="text-xs underline decoration-2 text-brand-acid">
          Open chat →
        </Link>
      </div>
    </>
  );
}

import { useQueryClient } from "@tanstack/react-query";

function FollowRequestRow({ user }: { user: { id: number; first_name: string; last_name: string; avatar?: string } }) {
  const qc = useQueryClient();
  const act = async (kind: "accept" | "decline") => {
    await apiFetch(`/api/followers/${kind}?follower_id=${user.id}`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["followers", "pending"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <div className="flex items-center gap-3">
      <Avatar src={user.avatar} name={`${user.first_name} ${user.last_name}`} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase truncate">
          {user.first_name} {user.last_name}
        </p>
      </div>
      <button onClick={() => act("accept")} className="brutalist-btn bg-brand-acid px-2 py-1 text-[10px] font-bold uppercase">
        OK
      </button>
      <button onClick={() => act("decline")} className="brutalist-btn bg-white px-2 py-1 text-[10px] font-bold uppercase">
        X
      </button>
    </div>
  );
}

import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
});

type Group = {
  id: number;
  title: string;
  description: string;
  creator_id: number;
  role?: string;
  member_count?: number;
};

function GroupsPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const { data, isError, error } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<Group[]>("/api/groups"),
    staleTime: 30_000,
    retry: 0,
  });
  const create = useMutation({
    mutationFn: () => apiFetch("/api/groups/create", { method: "POST", body: { title, description: desc } }),
    onSuccess: () => {
      toast.success("Group created");
      setTitle("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <AppShell>
      <h1 className="font-display text-4xl uppercase tracking-tighter">Groups</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          create.mutate();
        }}
        className="brutalist-card p-6 space-y-3"
      >
        <h3 className="font-display text-lg uppercase">Start a new group</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full brutalist-input" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className="w-full brutalist-input" />
        <button className="brutalist-btn bg-brand-acid px-6 py-2 font-display uppercase text-sm" style={{ background: "var(--brand-acid)" }}>
          Create
        </button>
      </form>
      {isError && (
        <div className="brutalist-card p-6 text-center border-red-400">
          <p className="text-sm uppercase text-red-500">{(error as Error)?.message || "Could not load groups."}</p>
        </div>
      )}
      {!isError && (
      <div className="grid gap-4">
        {(data ?? []).map((g) => (
          <Link
            key={g.id}
            to="/groups/$groupId"
            params={{ groupId: String(g.id) }}
            className="brutalist-card p-6 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform block"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl uppercase">{g.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{g.description}</p>
              </div>
              {g.role && (
                <span className="text-[10px] font-bold uppercase bg-brand-black text-white px-2 py-1" style={{ background: "var(--brand-black)", color: "white" }}>
                  {g.role}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      )}
    </AppShell>
  );
}

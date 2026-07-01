import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupService } from "@/services/mockApi";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import React, { useState } from "react";
import { toast } from "sonner";
import { Users, Lock, Globe, Sparkles, Plus, X } from "lucide-react";
import { fmtCount } from "@/lib/format";
import type { Group } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [{ title: "Groups — fakebook" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setCreating(true);
    try {
      await groupService.createGroup(name.trim(), description.trim());
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created successfully");
      setShowCreateModal(false);
      setName("");
      setDescription("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-sm text-muted-foreground mt-1">Discover communities, attend events, and meet people who share your interests.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </header>

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border text-popover-foreground rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-base">Create new group</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Group Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Science Pioneers"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group about?"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="yours">Your groups</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-4"><GroupList filter="all" /></TabsContent>
        <TabsContent value="trending" className="mt-4"><GroupList filter="trending" /></TabsContent>
        <TabsContent value="new" className="mt-4"><GroupList filter="new" /></TabsContent>
        <TabsContent value="yours" className="mt-4"><GroupList filter="yours" /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function GroupList({ filter }: { filter: "all" | "trending" | "new" | "yours" }) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", filter],
    queryFn: () => groupService.list(filter),
  });
  if (isLoading) return <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 surface-card animate-pulse" />)}</div>;
  if (groups.length === 0) return <div className="surface-card p-10 text-center text-sm text-muted-foreground">Nothing here yet.</div>;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {groups.map((g) => <GroupCard key={g.id} g={g} />)}
    </div>
  );
}

function GroupCard({ g }: { g: Group }) {
  const qc = useQueryClient();
  const join = useMutation({
    mutationFn: () => groupService.join(g.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
  const leave = useMutation({
    mutationFn: () => groupService.leave(g.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });

  return (
    <article className="surface-card overflow-hidden flex flex-col">
      <div className="h-24 bg-muted">
        <img src={g.cover} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="-mt-8 h-12 w-12 rounded-xl bg-background ring-4 ring-background overflow-hidden shrink-0">
            <img src={g.icon} alt="" className="w-full h-full" />
          </div>
          <div className="min-w-0 flex-1">
            <Link to="/groups/$id" params={{ id: g.id }} className="font-semibold text-sm truncate block hover:underline">{g.name}</Link>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              {g.privacy === "private" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              <span>{g.privacy === "private" ? "Private" : "Public"}</span>
              <span>·</span>
              <span>{g.category}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{g.description}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{fmtCount(g.members)} members</span>
          <span className={cn("inline-flex items-center gap-1.5", g.activity === "high" && "text-success")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", g.activity === "high" ? "bg-success live-dot" : "bg-muted-foreground/50")} />
            {g.online} online
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          {g.membership === "owner" && <Button size="sm" variant="outline" className="flex-1"><Sparkles className="h-3.5 w-3.5 mr-1" />Owner</Button>}
          {g.membership === "member" && <Button size="sm" variant="secondary" className="flex-1" onClick={() => leave.mutate()}>Joined</Button>}
          {g.membership === "pending" && <Button size="sm" variant="outline" className="flex-1" disabled>Request sent</Button>}
          {g.membership === "invited" && (
            <>
              <Button size="sm" className="flex-1" onClick={() => join.mutate()}>Accept</Button>
              <Button size="sm" variant="outline" className="flex-1">Decline</Button>
            </>
          )}
          {g.membership === "none" && <Button size="sm" className="flex-1" onClick={() => join.mutate()}>{g.privacy === "private" ? "Request to join" : "Join group"}</Button>}
          <Button size="sm" variant="ghost" asChild>
            <Link to="/groups/$id" params={{ id: g.id }}>View</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

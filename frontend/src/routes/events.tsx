import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventService, groupService } from "@/services/mockApi";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Globe } from "lucide-react";
import type { EventItem } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events — fakebook" }] }),
  component: EventsPage,
});

function EventsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();

  const { data: myGroups = [] } = useQuery({
    queryKey: ["groups", "yours"],
    queryFn: () => groupService.list("yours"),
    enabled: createOpen,
  });

  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [online, setOnline] = useState(false);

  const create = useMutation({
    mutationFn: () => eventService.createEvent(groupId, {
      title,
      description,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      location,
      online
    }),
    onSuccess: () => {
      setCreateOpen(false);
      setGroupId("");
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setLocation("");
      setOnline(false);
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to create event: " + (err.message || "Unknown error"));
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) {
      toast.error("Please select a group hosting the event.");
      return;
    }
    if (!title.trim() || !startsAt || !endsAt || !location.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    create.mutate();
  };

  return (
    <AppShell>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">In-person, online, and everywhere in between.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create event</Button>
      </header>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="joined">Going</TabsTrigger>
          <TabsTrigger value="created">Hosting</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4"><Grid filter="upcoming" /></TabsContent>
        <TabsContent value="joined" className="mt-4"><Grid filter="joined" /></TabsContent>
        <TabsContent value="created" className="mt-4"><Grid filter="created" /></TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <h2 className="text-lg font-bold mb-4">Create Group Event</h2>
            <button 
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Cancel
            </button>
            <form onSubmit={handleCreate} className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Hosting Group *</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  required
                >
                  <option value="">Select a group you are in...</option>
                  {myGroups.map((g) => (
                    <option key={g.id} value={g.id}>                    {g.name}</option>
                  ))}
                </select>
                {myGroups.length === 0 && (
                  <p className="text-[11px] text-destructive mt-1">You must belong to at least one group to create an event.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Event Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Punch Card Jam Session"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea
                  placeholder="Tell us what this event is about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Starts At *</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Ends At *</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Babbage Lecture Hall or Zoom link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="online"
                  checked={online}
                  onChange={(e) => setOnline(e.target.checked)}
                  className="rounded border bg-background focus:ring-2 focus:ring-ring/40 h-4 w-4 text-primary"
                />
                <label htmlFor="online" className="text-sm font-semibold select-none">This is an online event</label>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={create.isPending || myGroups.length === 0}
                >
                  {create.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Grid({ filter }: { filter: "upcoming" | "joined" | "created" }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["events", filter],
    queryFn: () => eventService.list(filter),
  });
  if (isLoading) return <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-56 surface-card animate-pulse" />)}</div>;
  if (data.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">Nothing here yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Events you're attending or hosting will show up here.</p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {data.map((e) => <EventCard key={e.id} e={e} />)}
    </div>
  );
}

function EventCard({ e }: { e: EventItem }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => eventService.toggleGoing(e.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
  const date = new Date(e.startsAt);
  return (
    <article className="surface-card overflow-hidden">
      <div className="relative h-32 bg-muted">
        <img src={e.cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 rounded-md bg-background/90 backdrop-blur px-2 py-1 text-center min-w-[44px]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{date.toLocaleString(undefined, { month: "short" })}</div>
          <div className="text-lg font-bold leading-none">{date.getDate()}</div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold truncate">{e.title}</h3>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          <div className="flex items-center gap-1.5">{e.online ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}{e.location}</div>
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{e.attendees} going</div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant={e.going ? "secondary" : "default"} onClick={() => toggle.mutate()} className={cn("flex-1")}>
            {e.going ? "Going" : "Join event"}
          </Button>
          <Button size="sm" variant="outline">Details</Button>
        </div>
      </div>
    </article>
  );
}

import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupService, eventService, userService } from "@/services/mockApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostCard } from "@/components/feed/PostCard";
import { CreatePost } from "@/components/feed/CreatePost";
import {
  Globe, Lock, Users, Calendar, Sparkles, MapPin, Plus, X, UserPlus, Info, Check, UserCheck, MessageSquare
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { fmtCount } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/groups/$id")({
  head: () => ({ meta: [{ title: "Group Details — fakebook" }] }),
  component: GroupDetailPage,
});

function GroupDetailPage() {
  const { id } = useParams({ from: "/groups/$id" });
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [showEventModal, setShowEventModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Event form fields
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventOnline, setEventOnline] = useState(false);
  const [eventCreating, setEventCreating] = useState(false);

  // Group Details Query
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: () => groupService.get(id),
  });

  // Group Members Query
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", id],
    queryFn: () => groupService.getMembers(id),
    enabled: !!group,
  });

  // Group Posts Query
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["group-posts", id],
    queryFn: () => groupService.getPosts(id),
    enabled: !!group && (group.privacy !== "private" || group.membership === "member" || group.membership === "owner"),
  });

  // Group Events Query
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["group-events", id],
    queryFn: () => eventService.list("upcoming", id),
    enabled: !!group,
  });

  // Followers Query for Invitations
  const { data: followers = [] } = useQuery({
    queryKey: ["followers", me?.id],
    queryFn: () => (me?.id ? userService.listFollowers(me.id) : Promise.resolve([])),
    enabled: !!group && group.membership === "owner",
  });

  // Join/Leave Mutations
  const joinMut = useMutation({
    mutationFn: () => groupService.join(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", id] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group-members", id] });
      toast.success("Joined group!");
    },
  });

  const leaveMut = useMutation({
    mutationFn: () => groupService.leave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", id] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group-members", id] });
      toast.success("Left group!");
    },
  });

  // Create Event Mutation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventStartsAt || !eventEndsAt) {
      toast.error("Please fill in required fields");
      return;
    }
    setEventCreating(true);
    try {
      await eventService.createEvent(id, {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        startsAt: new Date(eventStartsAt).toISOString(),
        endsAt: new Date(eventEndsAt).toISOString(),
        location: eventLocation.trim(),
        online: eventOnline,
      });
      qc.invalidateQueries({ queryKey: ["group-events", id] });
      toast.success("Event created successfully!");
      setShowEventModal(false);
      setEventTitle("");
      setEventDesc("");
      setEventLocation("");
      setEventStartsAt("");
      setEventEndsAt("");
      setEventOnline(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setEventCreating(false);
    }
  };

  // Invite Mutation
  const inviteMut = useMutation({
    mutationFn: (userId: string) => groupService.invite(id, userId),
    onSuccess: () => {
      toast.success("Invitation sent!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send invitation");
    },
  });

  if (groupLoading || !group) {
    return (
      <AppShell>
        <div className="h-64 surface-card animate-pulse" />
      </AppShell>
    );
  }

  const isOwner = group.membership === "owner";
  const isMember = group.membership === "member" || isOwner;
  const isPrivate = group.privacy === "private";

  return (
    <AppShell>
      <div className="-mx-3 sm:-mx-5 lg:-mx-8">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-60 bg-muted overflow-hidden">
          <img src={group.cover} alt={group.name} className="w-full h-full object-cover" />
        </div>

        {/* Group Header Info */}
        <div className="px-3 sm:px-5 lg:px-8 border-b pb-4">
          <div className="-mt-10 flex flex-wrap items-end gap-4 justify-between">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-background border-4 border-background shadow-elevated overflow-hidden shrink-0 z-10">
              <img src={group.icon} alt="" className="w-full h-full" />
            </div>
            <div className="flex gap-2 pb-1">
              {isOwner ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="h-4 w-4 mr-1.5" /> Invite
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Owner
                  </Button>
                </>
              ) : isMember ? (
                <Button variant="secondary" size="sm" onClick={() => leaveMut.mutate()}>
                  Leave Group
                </Button>
              ) : group.membership === "pending" ? (
                <Button variant="outline" size="sm" disabled>
                  Request sent
                </Button>
              ) : (
                <Button size="sm" onClick={() => joinMut.mutate()}>
                  {isPrivate ? "Request to join" : "Join Group"}
                </Button>
              )}
              {isMember && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/messages/$id" params={{ id }}>
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Group Chat
                  </Link>
                </Button>
              )}
              {isMember && (
                <Button size="sm" className="gap-1.5" onClick={() => setShowEventModal(true)}>
                  <Plus className="h-4 w-4" /> Create Event
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-xl sm:text-2xl font-bold">{group.name}</h1>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
              {isPrivate ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="font-medium">{isPrivate ? "Private Group" : "Public Group"}</span>
              <span>·</span>
              <span>{fmtCount(group.members)} members</span>
              <span>·</span>
              <span>{group.category}</span>
            </div>
            <p className="mt-3 text-sm text-foreground max-w-2xl leading-relaxed">{group.description}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-3 sm:px-5 lg:px-8 mt-4">
          {isPrivate && !isMember ? (
            <div className="surface-card p-12 text-center max-w-md mx-auto mt-8">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-base font-bold">This Group is Private</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Join this group to view its feed posts, upcoming events, and participate in discussions.
              </p>
              <Button className="mt-4" onClick={() => joinMut.mutate()}>
                Request to join
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="feed">
              <TabsList className="border-b w-full justify-start rounded-none h-auto p-0 bg-transparent gap-6">
                <TabsTrigger value="feed" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-1 py-3 text-sm font-semibold shadow-none">
                  Feed
                </TabsTrigger>
                <TabsTrigger value="events" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-1 py-3 text-sm font-semibold shadow-none">
                  Events ({events.length})
                </TabsTrigger>
                <TabsTrigger value="members" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-1 py-3 text-sm font-semibold shadow-none">
                  Members ({members.length})
                </TabsTrigger>
              </TabsList>

              {/* Feed Tab */}
              <TabsContent value="feed" className="space-y-4 mt-4">
                {isMember && <CreatePost groupId={id} />}
                
                {postsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-44 surface-card animate-pulse" />)
                ) : posts.length === 0 ? (
                  <div className="surface-card p-10 text-center text-sm text-muted-foreground">
                    No posts inside this group yet.
                  </div>
                ) : (
                  posts.map((p) => <PostCard key={p.id} post={p} />)
                )}
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="grid sm:grid-cols-2 gap-4 mt-4">
                {eventsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 surface-card animate-pulse" />)
                ) : events.length === 0 ? (
                  <div className="col-span-full surface-card p-10 text-center text-sm text-muted-foreground">
                    No upcoming events listed for this group.
                  </div>
                ) : (
                  events.map((e) => (
                    <article key={e.id} className="surface-card p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                            {e.online ? "Online" : "In-Person"}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(e.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm mt-2 line-clamp-1">{e.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{e.description}</p>
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{e.location}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <span className="text-[11px] text-muted-foreground font-medium">{e.attendees} going</span>
                        <Button
                          size="sm"
                          variant={e.going ? "secondary" : "outline"}
                          className="h-8 text-xs rounded-full px-4"
                          onClick={() => {
                            eventService.toggleGoing(e.id).then(() => {
                              qc.invalidateQueries({ queryKey: ["group-events", id] });
                              toast.success(e.going ? "Un-RSVPed" : "RSVPed successfully!");
                            });
                          }}
                        >
                          {e.going ? "Going ✓" : "RSVP"}
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-3 mt-4">
                {membersLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 surface-card animate-pulse" />)
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="surface-card p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Link to="/profile/$id" params={{ id: m.id }}>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={m.avatar} alt={m.name} />
                            <AvatarFallback>{m.name[0]}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="min-w-0">
                          <Link to="/profile/$id" params={{ id: m.id }} className="text-sm font-semibold hover:underline block truncate">
                            {m.name}
                          </Link>
                          <span className="text-xs text-muted-foreground block truncate">@{m.handle}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${m.role === "owner" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"}`}>
                        {m.role}
                      </span>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border text-popover-foreground rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-base">Create new event</h2>
              <button onClick={() => setShowEventModal(false)} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Event Title *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Analytics Hackathon"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Tell members about the event..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Starts At *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStartsAt}
                    onChange={(e) => setEventStartsAt(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Ends At *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEndsAt}
                    onChange={(e) => setEventEndsAt(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. Building B, Room 402"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="online"
                  checked={eventOnline}
                  onChange={(e) => setEventOnline(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="online" className="text-sm font-medium select-none cursor-pointer">This is an online event</label>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => setShowEventModal(false)}>Cancel</Button>
                <Button type="submit" disabled={eventCreating}>{eventCreating ? "Creating..." : "Create Event"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border text-popover-foreground rounded-lg shadow-lg w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-base">Invite followers</h2>
              <button onClick={() => setShowInviteModal(false)} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-3">
              {followers.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No followers available to invite.
                </div>
              ) : (
                followers.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 p-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={f.avatar} alt={f.name} />
                        <AvatarFallback>{f.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">@{f.handle}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-3"
                      onClick={() => inviteMut.mutate(f.id)}
                    >
                      Invite
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end p-4 border-t bg-muted/20">
              <Button size="sm" variant="secondary" onClick={() => setShowInviteModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

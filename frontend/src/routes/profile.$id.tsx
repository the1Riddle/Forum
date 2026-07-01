import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { userService, postService } from "@/services/mockApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FollowButton, PersonRow } from "@/components/social/FollowButton";
import { PostCard } from "@/components/feed/PostCard";
import { Lock, MapPin, Calendar, BadgeCheck, Mail, MoreHorizontal } from "lucide-react";
import { fmtCount } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({ meta: [{ title: "Profile — fakebook" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = useParams({ from: "/profile/$id" });
  const me = useAuthStore((s) => s.user);
  const isOwn = me?.id === id;
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getUser(id),
  });
  const { data: followState } = useQuery({
    queryKey: ["follow-state", id],
    queryFn: () => userService.getFollowState(id),
    enabled: !isOwn,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", id],
    queryFn: () => postService.userPosts(id),
  });
  const { data: followers = [] } = useQuery({
    queryKey: ["followers", id],
    queryFn: () => userService.listFollowers(id),
  });
  const { data: following = [] } = useQuery({
    queryKey: ["following", id],
    queryFn: () => userService.listFollowing(id),
  });

  if (isLoading || !user) {
    return <AppShell><div className="h-64 surface-card animate-pulse" /></AppShell>;
  }

  const restricted = user.isPrivate && !isOwn && followState !== "following" && followState !== "mutual";

  return (
    <AppShell>
      <div className="-mx-3 sm:-mx-5 lg:-mx-8">
        <div className="relative h-40 sm:h-56 bg-muted overflow-hidden">
          {user.cover && <img src={user.cover} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-3 sm:px-5 lg:px-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4 justify-between">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-elevated">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2 pb-1">
              {isOwn ? (
                <>
                  <Button variant="outline" size="sm">Edit profile</Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1.5" />Message</Button>
                  <FollowButton userId={user.id} size="default" />
                </>
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">{user.name}</h1>
              {user.isVerified && <BadgeCheck className="h-5 w-5 text-primary" />}
              {user.isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> Private
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">@{user.handle} · {user.pronouns}</div>
            {user.bio && <p className="mt-3 text-[15px] leading-relaxed max-w-prose">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {user.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{user.location}</span>}
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />Joined {new Date(user.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            </div>
            <div className="mt-3 flex gap-5 text-sm">
              <span><b className="font-semibold">{fmtCount(user.following)}</b> <span className="text-muted-foreground">Following</span></span>
              <span><b className="font-semibold">{fmtCount(user.followers)}</b> <span className="text-muted-foreground">Followers</span></span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts" className="mt-6">
        <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-1">
          {["posts","media","about","followers","following"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-4">
          {restricted ? <Restricted user={user} /> : posts.length === 0 ? <Empty label="No posts yet" /> : posts.map((p) => <PostCard key={p.id} post={p} />)}
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          {restricted ? <Restricted user={user} /> : (
            <div className="grid grid-cols-3 gap-1">
              {posts.filter((p) => p.image).slice(0, 18).map((p) => (
                <div key={p.id} className="aspect-square overflow-hidden rounded-md bg-muted">
                  <img src={p.image!} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4 surface-card p-5 space-y-3 text-sm">
          <Row label="Bio" value={user.bio} />
          <Row label="Location" value={user.location} />
          <Row label="Pronouns" value={user.pronouns} />
          <Row label="Joined" value={new Date(user.joinedAt).toLocaleDateString()} />
          <Row label="Privacy" value={user.isPrivate ? "Private profile" : "Public profile"} />
        </TabsContent>

        <TabsContent value="followers" className="mt-4 surface-card divide-y">
          {followers.map((u) => <div key={u.id} className="px-3"><PersonRow userId={u.id} /></div>)}
        </TabsContent>
        <TabsContent value="following" className="mt-4 surface-card divide-y">
          {following.map((u) => <div key={u.id} className="px-3"><PersonRow userId={u.id} /></div>)}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-28 text-muted-foreground">{label}</div>
      <div>{value || "—"}</div>
    </div>
  );
}
function Restricted({ user }: { user: { name: string } }) {
  return (
    <div className="surface-card p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">This account is private</h3>
      <p className="text-sm text-muted-foreground mt-1">Follow {user.name.split(" ")[0]} to see their posts.</p>
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="surface-card p-10 text-center text-sm text-muted-foreground">{label}</div>;
}

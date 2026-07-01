import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth, type User } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ChatThread } from "@/components/ChatThread";

export const Route = createFileRoute("/chat/$peerId")({
  component: ChatPeer,
});

function ChatPeer() {
  const { user, loading } = useAuth();
  const { peerId } = useParams({ from: "/chat/$peerId" });
  const { data } = useQuery({
    queryKey: ["profile", peerId],
    queryFn: () => apiFetch<{ profile: User }>(`/api/profile?id=${peerId}`),
  });
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  const title = data?.profile ? `${data.profile.first_name} ${data.profile.last_name}` : "Chat";
  return (
    <AppShell>
      <ChatThread peerId={Number(peerId)} title={title} />
    </AppShell>
  );
}

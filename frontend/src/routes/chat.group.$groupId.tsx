import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ChatThread } from "@/components/ChatThread";

export const Route = createFileRoute("/chat/group/$groupId")({
  component: GroupChat,
});

function GroupChat() {
  const { user, loading } = useAuth();
  const { groupId } = useParams({ from: "/chat/group/$groupId" });
  const { data } = useQuery({
    queryKey: ["group", Number(groupId)],
    queryFn: () => apiFetch<{ group: { title: string } }>(`/api/groups/get?id=${groupId}`),
  });
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  return (
    <AppShell>
      <ChatThread groupId={Number(groupId)} title={`#${data?.group.title ?? "group"}`} />
    </AppShell>
  );
}

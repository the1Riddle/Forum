import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService, userService } from "@/services/mockApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/AppNav";
import { Send, Smile, Paperclip, Phone, Video, Info, ArrowLeft, Search, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import type { Conversation, Message } from "@/types";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — fakebook" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const params = useParams({ strict: false }) as { id?: string };
  return <Layout selectedId={params.id} />;
}

function Layout({ selectedId }: { selectedId?: string }) {
  const { data: convos = [] } = useQuery({ queryKey: ["conversations"], queryFn: () => chatService.listConversations() });
  const navigate = useNavigate();
  const showThread = !!selectedId;

  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", me?.id],
    queryFn: () => (me?.id ? userService.listFollowers(me.id) : Promise.resolve([])),
    enabled: !!me?.id && newMsgOpen,
  });

  const { data: following = [] } = useQuery({
    queryKey: ["following", me?.id],
    queryFn: () => (me?.id ? userService.listFollowing(me.id) : Promise.resolve([])),
    enabled: !!me?.id && newMsgOpen,
  });

  const candidates = Array.from(
    new Map([...followers, ...following].map((u) => [u.id, u])).values()
  ).filter((u) => u.id !== me?.id && (
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.handle.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  const startChat = useMutation({
    mutationFn: (otherId: string) => chatService.startConversation("dm", [otherId]),
    onSuccess: (newConvo) => {
      setNewMsgOpen(false);
      setSearchQuery("");
      qc.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: "/messages/$id", params: { id: newConvo.id } });
    },
  });

  return (
    <div className="min-h-dvh flex bg-background">
      <Sidebar />
      <div className="flex-1 flex h-dvh overflow-hidden">
        <aside className={cn("w-full md:w-80 lg:w-96 shrink-0 border-r flex flex-col", showThread && "hidden md:flex")}>
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search conversations" className="h-9 w-full rounded-full border bg-muted/40 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {convos.map((c) => (
              <ConvRow key={c.id} c={c} selected={c.id === selectedId} onClick={() => navigate({ to: "/messages/$id", params: { id: c.id } })} />
            ))}
          </div>
          <button 
            onClick={() => setNewMsgOpen(true)}
            className="m-3 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New message
          </button>
        </aside>

        <section className={cn("flex-1 flex flex-col min-w-0", !showThread && "hidden md:flex")}>
          {selectedId ? <Thread id={selectedId} /> : <EmptyThread />}
        </section>
      </div>

      {/* New Message Dialog */}
      {newMsgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <h2 className="text-lg font-bold mb-4">New Message</h2>
            <button 
              onClick={() => { setNewMsgOpen(false); setSearchQuery(""); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Cancel
            </button>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search followers/following..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border bg-muted/45 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
              {candidates.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No followers or followed users found.
                </div>
              ) : (
                candidates.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startChat.mutate(user.id)}
                    disabled={startChat.isPending}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent text-left transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">@{user.handle}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConvRow({ c, selected, onClick }: { c: Conversation; selected: boolean; onClick: () => void }) {
  const participants = chatService.getParticipants(c);
  const me = useAuthStore((s) => s.user);
  const other = participants.find((p) => p.id !== me?.id) ?? participants[0];
  const title = c.title ?? other?.name ?? "Conversation";
  const avatar = c.icon ?? other?.avatar;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2",
        selected ? "bg-accent border-primary" : "border-transparent hover:bg-accent/60",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={avatar} alt={title} />
          <AvatarFallback>{title[0]}</AvatarFallback>
        </Avatar>
        {c.kind === "dm" && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate">{title}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">{c.lastMessage && relTime(c.lastMessage.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs truncate", c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
            {c.lastMessage?.text}
          </span>
          {c.unread > 0 && <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold grid place-items-center">{c.unread}</span>}
        </div>
      </div>
    </button>
  );
}

function EmptyThread() {
  return (
    <div className="flex-1 grid place-items-center p-8 text-center">
      <div>
        <div className="mx-auto h-14 w-14 rounded-full bg-muted grid place-items-center mb-3">
          <Send className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="font-semibold text-lg">Your messages</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">Send a message to start a conversation. Pick a contact from the sidebar.</p>
      </div>
    </div>
  );
}

function Thread({ id }: { id: string }) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: conv } = useQuery({ queryKey: ["conversation", id], queryFn: () => chatService.getConversation(id) });
  const { data: messages = [] } = useQuery({ queryKey: ["messages", id], queryFn: () => chatService.getMessages(id) });
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = chatService.subscribe(id, (msg) => {
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (msg.authorId !== me?.id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 300);
      }
    });
    return () => { unsub(); };
  }, [id, qc, me?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  const send = useMutation({
    mutationFn: (text: string) => chatService.sendMessage(id, text),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: ["messages", id] });
      const previousMessages = qc.getQueryData<Message[]>(["messages", id]) || [];
      const tempMessage: Message = {
        id: "temp_" + Date.now(),
        conversationId: id,
        authorId: me?.id || "",
        text: text,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Message[]>(["messages", id], [...previousMessages, tempMessage]);
      return { previousMessages };
    },
    onError: (err, text, context) => {
      if (context?.previousMessages) {
        qc.setQueryData(["messages", id], context.previousMessages);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleSend = () => {
    const v = draft.trim();
    if (!v) return;
    send.mutate(v);
    setDraft("");
  };

  if (!conv) return <EmptyThread />;
  const participants = chatService.getParticipants(conv);
  const other = participants.find((p) => p.id !== me?.id) ?? participants[0];
  const title = conv.title ?? other?.name ?? "Conversation";
  const avatar = conv.icon ?? other?.avatar;

  return (
    <>
      <header className="h-14 border-b flex items-center gap-3 px-3 md:px-4">
        <button className="md:hidden p-1.5 -ml-1.5 rounded hover:bg-accent" onClick={() => navigate({ to: "/messages" })}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatar} alt={title} />
          <AvatarFallback>{title[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{title}</div>
          <div className="text-xs text-muted-foreground">{conv.kind === "group" ? `${participants.length} members` : "Active now"}</div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button className="p-2 rounded-full hover:bg-accent" aria-label="Call"><Phone className="h-4 w-4" /></button>
          <button className="p-2 rounded-full hover:bg-accent" aria-label="Video"><Video className="h-4 w-4" /></button>
          <button className="p-2 rounded-full hover:bg-accent" aria-label="Info"><Info className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 md:px-6 py-4 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const mine = m.authorId === me?.id;
            const prev = messages[i - 1];
            const grouped = prev && prev.authorId === m.authorId;
            const isGroup = conv.kind === "group";
            return <Bubble key={m.id} m={m} mine={mine} grouped={!!grouped} isGroup={isGroup} />;
          })}
        </AnimatePresence>
        {typing && (
          <div className="flex items-end gap-1.5 px-2 py-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.15s]" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.3s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex items-end gap-2">
        <button className="p-2 rounded-full hover:bg-accent text-muted-foreground" aria-label="Attach"><Paperclip className="h-4 w-4" /></button>
        <button className="p-2 rounded-full hover:bg-accent text-muted-foreground" aria-label="Emoji"><Smile className="h-4 w-4" /></button>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message…"
          className="flex-1 max-h-32 resize-none rounded-2xl border bg-muted/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <Button size="icon" className="h-9 w-9 rounded-full" onClick={handleSend} disabled={!draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function Bubble({ m, mine, grouped, isGroup }: { m: Message; mine: boolean; grouped: boolean; isGroup: boolean }) {
  const { data: author } = useQuery({
    queryKey: ["user", m.authorId],
    queryFn: () => userService.getUser(m.authorId),
    enabled: isGroup && !mine,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex items-end gap-2 w-full",
        mine ? "justify-end" : "justify-start",
        grouped ? "mt-0.5" : "mt-3"
      )}
    >
      {!mine && isGroup && (
        <div className="w-7 h-7 shrink-0 select-none">
          {!grouped && author && (
            <Link to="/profile/$id" params={{ id: author.id }}>
              <Avatar className="h-7 w-7">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback>{author.name[0]}</AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      )}
      
      <div className="flex flex-col max-w-[70%] md:max-w-[78%]">
        {!mine && isGroup && !grouped && author && (
          <span className="text-[10px] text-muted-foreground ml-1.5 mb-0.5 font-semibold">
            {author.name}
          </span>
        )}
        <div className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-snug break-words",
          mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
        )}>
          {m.text}
          <div className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "text-left")}>
            {relTime(m.createdAt)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

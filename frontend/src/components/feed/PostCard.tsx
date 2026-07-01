import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Globe, Users as UsersIcon, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Post, Comment } from "@/types";
import { relTime, fmtCount } from "@/lib/format";
import { postService } from "@/services/mockApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

const PRIVACY = {
  public: { Icon: Globe, label: "Public" },
  followers: { Icon: UsersIcon, label: "Followers" },
  private: { Icon: Lock, label: "Only me" },
};

export function PostCard({ post }: { post: Post }) {
  const { data: author } = useQuery({
    queryKey: ["author", post.authorId],
    queryFn: () => postService.getAuthor(post.authorId),
  });
  const qc = useQueryClient();
  
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<{ liked: boolean; likes: number } | null>(null);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => postService.postComments(post.id),
    enabled: commentsOpen,
  });

  const likeMut = useMutation({
    mutationFn: () => postService.toggleLike(post.id),
    onMutate: () => {
      setOptimistic({
        liked: !post.liked,
        likes: post.likes + (post.liked ? -1 : 1),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      setOptimistic(null);
    },
  });

  const saveMut = useMutation({
    mutationFn: () => postService.toggleSave(post.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const addCommentMut = useMutation({
    mutationFn: (text: string) => postService.addComment(post.id, text),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Comment posted!");
    },
  });

  const shareMut = useMutation({
    mutationFn: () => postService.createPost({
      text: `Shared from @${author?.handle}:\n\n${post.text}`,
      image: post.image,
      privacy: "public",
    }),
    onSuccess: () => {
      setShareOpen(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Post shared to your feed!");
    },
    onError: (err: any) => {
      toast.error("Failed to share post: " + (err.message || "Unknown error"));
    }
  });

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMut.mutate(commentText);
  };

  const liked = optimistic?.liked ?? post.liked;
  const likes = optimistic?.likes ?? post.likes;
  const Priv = PRIVACY[post.privacy];

  const topLevelComments = comments.filter((c) => !c.parentId);

  if (!author) return null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="surface-card overflow-hidden"
    >
      <header className="flex items-start gap-3 p-4">
        <Link to="/profile/$id" params={{ id: author.id }}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to="/profile/$id" params={{ id: author.id }} className="font-semibold text-sm hover:underline truncate">
              {author.name}
            </Link>
            {author.isVerified && (
              <span className="text-primary text-xs" aria-label="Verified">✓</span>
            )}
            <span className="text-muted-foreground text-xs">@{author.handle}</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>{relTime(post.createdAt)}</span>
            <span>·</span>
            <Priv.Icon className="h-3 w-3" />
            <span>{Priv.label}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </header>

      {post.text && (
        <div className="px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">{post.text}</div>
      )}

      {post.image && (
        <div className="border-y bg-muted/40">
          <img src={post.image} alt="" loading="lazy" className="w-full max-h-[520px] object-cover" />
        </div>
      )}

      <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{fmtCount(likes)} reactions</span>
        <span>{fmtCount(post.comments)} comments · {fmtCount(post.shares)} shares</span>
      </div>

      <div className="px-2 pb-2 grid grid-cols-4 gap-1 border-t pt-1">
        <Action
          onClick={() => likeMut.mutate()}
          active={liked}
          activeClass="text-rose-500"
          icon={<Heart className={cn("h-[18px] w-[18px]", liked && "fill-current")} />}
          label={liked ? "Liked" : "Like"}
        />
        <Action 
          onClick={() => setCommentsOpen(!commentsOpen)}
          active={commentsOpen}
          activeClass="text-primary"
          icon={<MessageCircle className="h-[18px] w-[18px]" />} 
          label="Comment" 
        />
        <Action 
          onClick={() => setShareOpen(true)}
          icon={<Share2 className="h-[18px] w-[18px]" />} 
          label="Share" 
        />
        <Action
          onClick={() => saveMut.mutate()}
          active={post.saved}
          activeClass="text-primary"
          icon={<Bookmark className={cn("h-[18px] w-[18px]", post.saved && "fill-current")} />}
          label={post.saved ? "Saved" : "Save"}
        />
      </div>

      {/* Expanded Comments Section */}
      {commentsOpen && (
        <div className="border-t bg-muted/10 pb-3">
          <form onSubmit={handleSendComment} className="flex gap-2 p-3 items-center">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-background rounded-full border px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <Button type="submit" size="sm" disabled={!commentText.trim() || addCommentMut.isPending} className="rounded-full px-4 text-xs h-8">
              Post
            </Button>
          </form>

          {commentsLoading ? (
            <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">Loading comments...</div>
          ) : (
            <div className="px-4 space-y-4">
              {topLevelComments.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">No comments yet. Be the first to comment!</div>
              ) : (
                topLevelComments.map((comment) => (
                  <CommentRow 
                    key={comment.id} 
                    comment={comment} 
                    postId={post.id} 
                    allComments={comments} 
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Share Confirmation Dialog */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-2">Share Post</h2>
            <p className="text-sm text-muted-foreground mb-6">Would you like to share this post to your public feed?</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShareOpen(false)} disabled={shareMut.isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => shareMut.mutate()} disabled={shareMut.isPending}>
                {shareMut.isPending ? "Sharing..." : "Share Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  );
}

function CommentRow({ comment, postId, allComments }: { comment: Comment; postId: string; allComments: Comment[] }) {
  const { data: author } = useQuery({
    queryKey: ["author", comment.authorId],
    queryFn: () => postService.getAuthor(comment.authorId),
  });

  const qc = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [optimistic, setOptimistic] = useState<{ liked: boolean; likes: number } | null>(null);

  const liked = optimistic?.liked ?? comment.liked;
  const likes = optimistic?.likes ?? comment.likes;

  const likeMut = useMutation({
    mutationFn: () => postService.toggleCommentLike(comment.id),
    onMutate: () => {
      setOptimistic({
        liked: !comment.liked,
        likes: comment.likes + (comment.liked ? -1 : 1),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      setOptimistic(null);
    },
  });

  const addReplyMut = useMutation({
    mutationFn: (text: string) => postService.addComment(postId, text, comment.id),
    onSuccess: () => {
      setReplyText("");
      setReplyOpen(false);
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Reply posted!");
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    addReplyMut.mutate(replyText);
  };

  if (!author) return null;

  const replies = allComments.filter((c) => c.parentId === comment.id);

  return (
    <div className="flex gap-3 py-2 text-sm items-start">
      <Link to="/profile/$id" params={{ id: author.id }} className="shrink-0 mt-0.5">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback>{author.name[0]}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/40 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to="/profile/$id" params={{ id: author.id }} className="font-semibold text-xs text-foreground hover:underline">
              {author.name}
            </Link>
            <span className="text-[10px] text-muted-foreground">@{author.handle}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{relTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-foreground text-xs leading-normal whitespace-pre-wrap">{comment.text}</p>
        </div>
        
        <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] text-muted-foreground select-none">
          <button 
            onClick={() => likeMut.mutate()}
            className={cn("hover:underline font-semibold flex items-center gap-0.5", liked && "text-rose-500")}
          >
            <Heart className={cn("h-3 w-3", liked && "fill-current")} />
            {liked ? "Liked" : "Like"}
          </button>
          
          <button 
            onClick={() => setReplyOpen(!replyOpen)}
            className={cn("hover:underline font-semibold", replyOpen && "text-primary")}
          >
            Reply
          </button>

          {likes > 0 && (
            <span className="flex items-center gap-0.5 font-semibold text-rose-500">
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500 animate-in zoom-in duration-200" />
              {likes}
            </span>
          )}
        </div>

        {replyOpen && (
          <form onSubmit={handleSendReply} className="flex gap-2 mt-2 items-center px-2">
            <input
              type="text"
              placeholder={`Reply to @${author.handle}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-background rounded-full border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
              autoFocus
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!replyText.trim() || addReplyMut.isPending} 
              className="rounded-full px-3 text-[11px] h-7 shrink-0"
            >
              Reply
            </Button>
          </form>
        )}

        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="mt-3 pl-3 border-l border-muted/50 space-y-3">
            {replies.map((reply) => (
              <CommentRow 
                key={reply.id} 
                comment={reply} 
                postId={postId} 
                allComments={allComments} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Action({
  icon, label, onClick, active, activeClass,
}: { icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean; activeClass?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        active && activeClass,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
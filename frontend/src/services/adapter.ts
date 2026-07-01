import type { Comment, Conversation, EventItem, FollowState, Group, Message, Notification, Post, User } from "@/types";

export function adaptUser(b: any): User {
  const id = String(b.id);
  const firstName = b.first_name || "";
  const lastName = b.last_name || "";
  const name = b.nickname || `${firstName} ${lastName}`.trim();
  const handle = b.nickname || `user_${id.slice(0, 4)}`;
  return {
    id,
    handle,
    name,
    avatar: b.avatar || "",
    cover: b.cover || undefined,
    bio: b.about_me || undefined,
    location: b.location || undefined,
    pronouns: b.pronouns || undefined,
    isPrivate: b.is_public === false,
    isVerified: false,
    followers: b.followers_count || 0,
    following: b.following_count || 0,
    joinedAt: b.created_at || new Date().toISOString(),
  };
}

export function adaptPost(b: any): Post {
  return {
    id: String(b.id),
    authorId: String(b.user_id),
    createdAt: b.created_at,
    text: b.content || b.title || "",
    image: b.image || undefined,
    privacy: b.privacy === "almost_private" ? "followers" : (b.privacy || "public"),
    likes: b.likes_count || 0,
    comments: b.comments_count || 0,
    shares: 0,
    liked: b.user_reaction === "like" || undefined,
    saved: undefined,
    groupId: b.group_id ? String(b.group_id) : undefined,
  };
}

export function adaptComment(b: any): Comment {
  return {
    id: String(b.id),
    postId: String(b.post_id),
    authorId: String(b.user_id),
    parentId: undefined,
    text: b.content || "",
    createdAt: b.created_at,
    likes: b.likes_count || 0,
  };
}

export function adaptGroup(b: any): Group {
  const id = String(b.id);
  return {
    id,
    name: b.title || "",
    handle: `group_${id.slice(0, 4)}`,
    description: b.description || "",
    cover: b.cover || "",
    icon: b.icon || "",
    members: b.member_count || 0,
    online: 0,
    category: b.category || "general",
    privacy: b.privacy || "public",
    membership: b.role === "creator" ? "owner" : (b.role ? "member" : "none"),
    activity: "medium",
  };
}

export function adaptNotification(b: any): Notification {
  return {
    id: String(b.id),
    type: b.type || "mention",
    actorId: b.from_user_id ? String(b.from_user_id) : "",
    targetId: b.group_id ? String(b.group_id) : undefined,
    createdAt: b.created_at,
    read: b.is_read || false,
    text: b.content || "",
  };
}

export function adaptMessage(b: any): Message {
  return {
    id: String(b.id),
    conversationId: b.receiver_id ? String(b.receiver_id) : (b.group_id ? String(b.group_id) : ""),
    authorId: String(b.sender_id),
    text: b.content || "",
    createdAt: b.created_at,
    seen: undefined,
    attachment: undefined,
  };
}

export function adaptGroupMember(b: any): User & { role: string } {
  const id = String(b.user_id || b.id);
  const name = `${b.first_name || ""} ${b.last_name || ""}`.trim();
  return {
    id,
    handle: `user_${id.slice(0, 4)}`,
    name,
    avatar: b.avatar || "",
    bio: undefined,
    isPrivate: false,
    followers: 0,
    following: 0,
    joinedAt: new Date().toISOString(),
    role: b.role || "member",
  };
}

export function adaptGroupPost(b: any): Post {
  return {
    id: String(b.id),
    authorId: String(b.user_id),
    createdAt: b.created_at,
    text: b.content || b.title || "",
    image: b.image || undefined,
    privacy: "public",
    likes: 0,
    comments: 0,
    shares: 0,
    groupId: b.group_id ? String(b.group_id) : undefined,
  };
}

export function adaptGroupEvent(b: any): EventItem {
  return {
    id: String(b.id),
    title: b.title || "",
    description: b.description || "",
    cover: "",
    startsAt: b.event_time || "",
    endsAt: "",
    location: "",
    online: false,
    groupId: b.group_id ? String(b.group_id) : undefined,
    hostId: String(b.creator_id),
    attendees: b.going_count || 0,
    going: undefined,
  };
}

export function adaptFollower(b: any): User {
  const id = String(b.follower_id || b.id);
  const name = b.first_name && b.last_name ? `${b.first_name} ${b.last_name}` : (b.username || "User");
  return {
    id,
    handle: `user_${id.slice(0, 4)}`,
    name,
    avatar: b.avatar || "",
    bio: undefined,
    isPrivate: false,
    followers: 0,
    following: 0,
    joinedAt: new Date().toISOString(),
  };
}

export function deriveFollowState(
  followStatus: string | undefined,
  isFollower: boolean | undefined,
  hasReversePending: boolean,
): FollowState {
  if (followStatus === "accepted") {
    return isFollower ? "mutual" : "following";
  }
  if (followStatus === "pending") {
    return "request_sent";
  }
  if (hasReversePending) {
    return "follows_you";
  }
  return "not_following";
}

export const knownUsersCache = new Map<string, User>();

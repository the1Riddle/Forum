# Social Forum — Build Plan

Frontend-only TanStack Start app that consumes your existing backend at `VITE_API_BASE_URL` (default `http://localhost:8080`). Cookie session auth (`credentials: 'include'`), full API coverage, realtime chat over `/ws`. Design: **Neo-Brutalist Editorial** (Syne + Inter, acid green `#DFFF5E`, orange `#FF4D00`, 2px black borders, `6px 6px 0` hard shadows).

## Configuration
- `.env.example` with `VITE_API_BASE_URL=http://localhost:8080`
- `src/lib/api.ts`: `apiFetch(path, opts)` — prepends base, sets `credentials: 'include'`, JSON headers, throws on non-2xx with parsed `{ error }`
- `src/lib/ws.ts`: singleton WebSocket to `${WS_BASE}/ws`, auto-reconnect w/ backoff, typed pub/sub for `private_message` / `group_message` / `typing`
- Backend note: your server must send `Access-Control-Allow-Origin: <frontend-origin>` and `Access-Control-Allow-Credentials: true` for cookies to work cross-origin

## Design tokens (src/styles.css)
Port the direction verbatim:
- Colors: `--brand-black #050505`, `--brand-acid #DFFF5E`, `--brand-orange #FF4D00`, `--brand-surface #F2F2F2`
- Fonts via `<link>` in `__root.tsx`: Syne 700/800 (display), Inter 400/500/600 (sans)
- `@utility brutalist-card` (2px black border + `6px 6px 0 0 #050505`)
- `@utility brutalist-btn` (3px shadow, active translates + drops shadow)

## Auth
- `src/lib/auth.tsx`: `AuthProvider` calling `GET /api/auth/me` on mount, exposes `{ user, login, register, logout, refresh }`
- Router `context.auth`; `_authenticated` layout redirects to `/auth` when `user === null`
- Routes: `/auth` (tabbed Login/Register with all register fields incl. DOB, optional avatar/nickname/about_me)

## Routes (file-based, all under `src/routes/`)
```
__root.tsx            root shell + fonts + Toaster + AuthProvider
auth.tsx              login / register
_authenticated.tsx    guard + 3-column brutalist layout (LeftSidebar / Outlet / RightSidebar)
_authenticated.index.tsx           feed (GET /api/posts) + composer
_authenticated.posts.$postId.tsx   post detail + comments + reactions
_authenticated.profile.$userId.tsx profile w/ follow, privacy, posts, followers, following
_authenticated.settings.tsx        edit own profile + toggle privacy
_authenticated.groups.index.tsx    list + create group
_authenticated.groups.$groupId.tsx group detail: members, posts, events, invite, join
_authenticated.notifications.tsx   list + mark read
_authenticated.chat.index.tsx      conversation list (followers + groups)
_authenticated.chat.$peerId.tsx    private thread (history + WS live + typing)
_authenticated.chat.group.$groupId.tsx group thread
```

## Data layer
TanStack Query throughout. One query hook per resource in `src/lib/queries/`:
- `usePosts`, `usePost`, `useCreatePost` (JSON or multipart when image file)
- `useComments`, `useAddComment`
- `useReact` (optimistic like/dislike toggle)
- `useProfile`, `useUpdateProfile`, `useTogglePrivacy`
- `useFollowers` (request/accept/decline/unfollow/pending)
- `useGroups`, `useGroup`, `useGroupInvite/Join/Accept/Decline`, `useGroupPost`, `useGroupEvent`, `useEventRespond`
- `useNotifications`, `useUnreadCount` (polled every 20s), `useMarkRead`
- `useChatHistory(userId)` + WS subscription merged into cache

## Components
- `PostCard`, `PostComposer` (title, content, image file, privacy select + user picker when `private`)
- `CommentThread`, `CommentComposer`
- `ReactionBar` (acid `+` / white `-` buttons matching direction)
- `Avatar` (resolves `/uploads/...` against API base)
- `NavRail` (Feed / Groups / Chat / Notifications w/ unread badge / Profile)
- `RightRail` (upcoming events, direct-signals chat mini-module, trending groups)
- `ChatWindow` (message list, typing indicator, input, sends via WS)
- `GroupEventCard` w/ going / not_going buttons
- `NotificationItem` w/ per-type CTAs (accept follow, accept invite, etc.)

## Technical notes
- All fetches use `credentials: 'include'` — cookie session flows automatically
- Image uploads: switch to `FormData` when a `File` is present, otherwise JSON
- WebSocket: opened once inside `_authenticated` layout after auth confirmed; reconnects with exponential backoff; incoming messages update `['chat', peerId]` / `['chat','group',groupId]` caches
- Optimistic updates for reactions and follow actions
- Errors surfaced via `sonner` toasts
- Root `head()` sets real title/description: "Social Forum — signals worth sharing"

## Out of scope (call out)
- No SSR of authenticated data (loaders stay client-side; cookie isn't on server during dev)
- No push notifications (polling `unread-count` instead)
- No file upload for avatars in this pass — avatar field accepts a URL string; add multipart avatar upload later if backend supports it

Approve to build.

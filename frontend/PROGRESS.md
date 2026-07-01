# Fakebook Development Progress Tracker

## Phase 1: Frontend Sanitization
- [x] Remove `@lovable.dev/vite-tanstack-config` dependency
- [x] Configure standard Vite and TanStack Start in `vite.config.ts`
- [x] Purge `@lovable.dev` references from `bunfig.toml`
- [x] Replace `lovable-error-reporting.ts` with generic `error-reporting.ts`
- [x] Update imports in `__root.tsx`
- [x] Verify clean client-side production build

## Phase 2: Database Setup & Migrations
- [ ] Initialize Go modules under `backend/`
- [ ] Setup `sqlite.go` connection manager
- [ ] Implement SQL migration scripts (`000001_create_users_table.up.sql` through `000008_create_notifications_table.up.sql` and down scripts)
- [ ] Build and verify migration run logic on backend startup

## Phase 3: Auth & Core API Handlers
- [x] Register (`POST /api/register`) with Bcrypt password hashing
- [x] Login (`POST /api/login`) with cookie-based session token storage
- [x] Status Check (`GET /api/me`) & Logout (`POST /api/logout`)
- [x] User Profile & Follow management API
- [x] Post & Comment creation and feed retrieval API
- [x] Group & Event creation, invite, and membership API
- [x] Local static file storage (`/uploads/`) endpoint

## Phase 4: WS Gateway (Real-time Messaging & Notifications)
- [x] WebSocket Upgrade & Auth middleware (`/ws`)
- [x] Real-time Hub routing engine (DM delivery, group broadcasting)
- [x] Live Notification alert push
- [x] Emojis compatibility check

## Phase 5: Frontend-Backend Integration
- [x] Refactor `src/services/mockApi` to fetch data from Go backend APIs
- [x] Handle auth status verification on app initialization (`/api/me`)
- [x] Implement multipart file upload for posts, comments, and registration
- [x] Integrate WebSocket connection for real-time messages and notifications

## Phase 6: Docker Containerization
- [x] Construct multi-stage `backend/Dockerfile`
- [x] Construct frontend `Dockerfile` using Node environment
- [x] Write Orchestration `docker-compose.yml`
- [x] Verify full application launch and execute manual audit steps

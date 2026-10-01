# Netbook

A full-stack social network — **MongoDB · Express · React 19 · Node · Socket.io**.

Posts, reels, stories with highlights, reactions, comments, friends,
group chats with admin controls, realtime notifications, explore grid,
and privacy-aware profiles — inspired by Facebook, Instagram and Messenger.

## Tech stack

| Layer | Tech |
|---|---|
| Client | React 19, Vite, Redux Toolkit + Persist, MUI, Tailwind v4, Framer Motion |
| Server | Express 5, Mongoose, Socket.io, express-validator, helmet, rate-limit |
| Auth | JWT access (15 min) + refresh (30 d) in httpOnly cookies, bcrypt, Google OAuth |
| Cache | Redis (`REDIS_URL`) with automatic in-process TTL fallback — never hard-down |
| Observability | pino structured logs w/ request IDs, Prometheus metrics at `/api/metrics` |
| Push | Web Push (VAPID) + service worker — works offline, no Firebase needed |
| AI | Local MiniLM embeddings (`@huggingface/transformers`) → semantic post search; Atlas `$vectorSearch` when `ATLAS_VECTOR_INDEX` is set |
| E2EE | WebCrypto ECDH P-256 + AES-256-GCM — opt-in encrypted DMs |
| Docs | OpenAPI 3 spec + Swagger UI at `/api/docs` |
| Media | Cloudinary unsigned uploads (images, video, avatars, covers, stories) |
| Email | Nodemailer + Gmail SMTP (verification & password-reset codes) |

## Features

- **Auth** — register/login/logout, silent refresh rotation, 6-digit email
  verification & password reset codes, Google sign-in
- **Feed** — **ranked "For You"** (recency decay + log-scaled engagement +
  author affinity, with same-author diversification), Friends / Close Friends
  tabs, opaque cursor pagination, infinite scroll, scroll restoration,
  "all caught up" marker. Exhausting the ranked pool seamlessly continues
  into the chronological archive.
- **Posts** — text, photo, video, gradient backgrounds, hashtags, @mentions,
  audience selector (public / friends / close friends / only me), edit, delete
- **Reactions** — like/love/haha/wow/sad/angry with per-emoji counts and
  who-reacted dialog
- **Comments** — photo comments, likes, one-level replies, cascades
- **Share/repost** — with caption, atomic share count
- **Stories** — 24 h tray, full-screen viewer (pause on hold, keyboard nav),
  close-friends audience, per-view tracking
- **Highlights** — save stories into named collections on your profile
  (archived stories stay selectable after expiry)
- **Reels** — full-screen snap feed, tap = pause, double-tap = like + heart
  burst, progress scrubber, persistent mute, keyboard nav
- **Explore** — engagement-ranked media grid, people + post search,
  recent-search chips
- **Friends** — requests (send/cancel/accept/decline), unfriend, suggestions,
  realtime sync via socket
- **Privacy model** — public accounts: anyone can view; private accounts:
  friends only. Enforced server-side across posts, stories and profiles
- **Close friends** — settings editor with search + star toggles; powers the
  feed tab, stories audience and post visibility
- **Chat** — DMs + groups, read receipts (✓✓), typing indicators, emoji
  reactions on messages, unsend, themes
- **Group admin** — multiple admins, promote/demote, remove members,
  permissions (who can send messages / who can add members)
- **Presence** — online/offline dots + last-seen via socket connect/disconnect
- **Notifications** — REST history + realtime socket + **Web Push (VAPID)**
  for offline users, unread tint + badge
- **E2EE DMs** — opt-in per conversation; ECDH P-256 key agreement →
  AES-256-GCM ciphertext; server stores `enc:{iv,ct}` only
- **Semantic search** — "AI" toggle on post search: MiniLM embeddings +
  cosine similarity (Atlas Vector Search path available)
- **Reports** — auto-hide post at 3 reports
- **UI** — dark/light mode (flash-free init), Inter, brand gradient,
  focus rings, reduced-motion, fully responsive with mobile bottom nav

## Structure

```
client/   React app (Vite) — pages, components, redux slices, api layer
server/   Express API — models, controllers, routes, socket, middleware
```

## Setup

### 1. MongoDB Atlas (free)

1. https://cloud.mongodb.com → create an M0 cluster
2. Database → Connect → Drivers → copy the `mongodb+srv://` URI
3. Network Access → Add IP → `0.0.0.0/0` (dev)

No MongoDB? The server falls back to an **in-memory MongoDB** automatically —
fine for a quick demo, data resets on restart.

### 2. Gmail app password (verification/reset emails)

1. Google Account → Security → enable 2-Step Verification
2. Search "App passwords" → create one for "Mail"
3. Copy the 16-char password into `server/.env` `EMAIL_PASS`

### 3. Server

```powershell
cd server
cp .env.example .env    # fill in MONGODB_URI, JWT_*, EMAIL_*, GOOGLE_CLIENT_ID
npm install
npm run dev             # → http://localhost:5000
```

Generate JWT secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Client

```powershell
cd client
cp .env.example .env    # fill in VITE_CLOUDINARY_* and VITE_GOOGLE_CLIENT_ID
npm install
npm run dev             # → http://localhost:5174
```

Vite proxies `/api` and `/socket.io` to `localhost:5000` — cookies stay
same-origin in dev, no CORS setup needed.

## Scripts

```powershell
# client
npm run dev        # dev server
npm run build      # production build
npm run lint       # eslint
npm test           # unit tests (vitest + jsdom)

# server
npm run dev        # node --watch
npm start          # production
npm test           # integration tests (supertest + in-memory MongoDB)
npm run loadtest   # autocannon suite — needs `npm run dev` running
```

Server tests run against a real (in-memory) MongoDB — auth flows, privacy
gating, reactions, chat + E2EE storage rules, health/metrics/docs endpoints.

## API quick map

```
POST /api/auth/register|login|logout|refresh|forgot|reset|send-verify-code|verify-email|google
GET  /api/auth/me

GET/POST /api/posts    PATCH/DELETE /api/posts/:id
PUT/DELETE /api/posts/:id/reaction    POST /api/posts/:id/share|report
GET  /api/posts/search?q=  /api/posts/tag/:tag  /api/posts/user/:id
GET  /api/posts/explore  /api/posts/reels    POST /api/posts/batch {ids}

GET/POST /api/comments/:postId    PUT /api/comments/:id/like    DELETE /api/comments/:id

GET  /api/friends    /api/friends/status/:id
POST /api/friends/request/:id    /api/friends/accept/:id
DELETE /api/friends/request/:id    /api/friends/:id

GET  /api/users/:id    /api/users/search?q=    /api/users/suggested
PATCH /api/users/me    PUT /api/users/me/saved/:postId
PUT  /api/users/me/close-friends/:uid

GET  /api/chat/conversations    POST /api/chat/conversations (DM)
POST /api/chat/groups    PATCH /api/chat/conversations/:id (name/theme/settings)
PUT/DELETE /api/chat/conversations/:id/members/:uid    (add/remove member)
PUT/DELETE /api/chat/conversations/:id/admins/:uid     (promote/demote admin)
GET/POST /api/chat/conversations/:id/messages    POST .../read
DELETE /api/chat/messages/:id    PUT /api/chat/messages/:id/react

GET  /api/notifications    PUT /api/notifications/:id/read    /read-all

GET/POST /api/stories    GET /api/stories/archive    DELETE /api/stories/:id
POST /api/stories/:id/view

GET  /api/highlights/user/:userId    POST /api/highlights    DELETE /api/highlights/:id
```

## API docs & ops

- **`/api/docs`** — Swagger UI over the full OpenAPI 3 spec (`/api/openapi.json`)
- **`/api/health`** — db state, uptime, cache backend, memory
- **`/api/metrics`** — Prometheus exposition (request counts/duration by route,
  cache hit rate, live socket gauge); set `METRICS_TOKEN` to gate it
- **Logs** — structured JSON (pino) with per-request UUIDs, pretty-printed in dev

## Performance

Cache-aside on hot reads (feed candidate pool, explore, author privacy
records, user search, tag feeds) — Redis when `REDIS_URL` is set, bounded
in-process TTL cache otherwise.

Measured locally (`npm run loadtest`, 40 connections × 15s, in-memory MongoDB):

| Endpoint | Throughput | p50 | p99 |
|---|---|---|---|
| `GET /api/posts` (ranked feed) | ~320 req/s | 122 ms | 237 ms |
| `GET /api/posts/explore` | ~346 req/s | 113 ms | 184 ms |
| `GET /api/health` | ~1330 req/s | 26 ms | 140 ms |

Feed p50 dropped ~3.6× (937 ms → 258 ms against remote Atlas M0) after adding
the candidate-pool + author caches.

## Design decisions worth knowing

- **Why JWT-in-cookies (not localStorage)** — httpOnly cookies are XSS-safe;
  refresh token is scoped to `/api/auth` so it can't ride arbitrary requests.
- **Why opaque feed cursors** — `r:<offset>:<bucket>` paginates a stable,
  bucketed candidate pool; `t:<createdAt>` continues into the archive.
  No duplicates, no "post jumping" when new content lands mid-scroll.
- **Why the privacy filter runs post-fetch** — audience rules need the
  *viewer's* relationship to each author, which a pure query can't express.
  Author records are cached per-id and busted on friend/privacy writes.
- **Why E2EE is opt-in per DM** — keys live in the device's IndexedDB; groups
  and cross-device history need a heavier key-distribution design (documented
  tradeoff, Signal-style).
- **Why semantic search falls back** — embeddings are a progressive
  enhancement; if the model can't load, keyword search answers instead. The
  API stays up regardless.

## Security

helmet · rate limiting (`RATE_LIMIT_MAX` to tune) · express-validator ·
bcrypt · httpOnly cookies · refresh cookie scoped to `/api/auth` ·
server-side privacy enforcement on every content query · E2EE ciphertext
never readable server-side

## Docs

- `FEATURE_RESEARCH.md` — feature-by-feature breakdown of how each system works
- `UI_DESIGN_SPEC.md` — design tokens, layout grid, accessibility requirements

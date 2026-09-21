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
| Media | Cloudinary unsigned uploads (images, video, avatars, covers, stories) |
| Email | Nodemailer + Gmail SMTP (verification & password-reset codes) |

## Features

- **Auth** — register/login/logout, silent refresh rotation, 6-digit email
  verification & password reset codes, Google sign-in
- **Feed** — For You / Friends / Close Friends tabs, cursor pagination,
  infinite scroll, scroll restoration, "all caught up" marker
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
- **Notifications** — REST history + realtime push, unread tint + badge
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
npm run dev     # dev server
npm run build   # production build
npm run lint    # eslint
npx vitest run  # unit tests (jsdom)

# server
npm run dev     # nodemon
npm start       # production
```

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

## Security

helmet · rate limiting · express-validator · bcrypt · httpOnly cookies ·
refresh cookie scoped to `/api/auth` · server-side privacy enforcement on
every content query

## Docs

- `FEATURE_RESEARCH.md` — feature-by-feature breakdown of how each system works
- `UI_DESIGN_SPEC.md` — design tokens, layout grid, accessibility requirements

# Netbook — MERN Edition

Full-stack social network: **MongoDB + Express + React + Node + Socket.io**.
Same UI as the Firebase version — all backend logic moved to a real server.

## Structure

```
server/   Express API + Socket.io + JWT httpOnly cookies
client/   React + Redux Toolkit + MUI + Tailwind (ported from Firebase version)
```

## Setup

### 1. MongoDB Atlas (free)

1. https://cloud.mongodb.com → create M0 cluster (free)
2. Database → Connect → Drivers → copy the `mongodb+srv://` URI
3. Network Access → Add IP → `0.0.0.0/0` (allow from anywhere, for dev)

### 2. Gmail app password (for verification/reset codes)

1. Google Account → Security → enable 2-Step Verification
2. Search "App passwords" → create one for "Mail"
3. Copy the 16-char password into `.env` `EMAIL_PASS`

### 3. Server

```powershell
cd server
cp .env.example .env    # fill in MONGODB_URI, JWT secrets, EMAIL_*
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
cp .env.example .env    # fill in VITE_CLOUDINARY_* (same values as before)
npm install
npm run dev             # → http://localhost:5174
```

Vite proxies `/api` and `/socket.io` to `localhost:5000` — cookies stay
same-origin in dev, no CORS pain.

## What's implemented

- **Auth**: register/login/logout, httpOnly cookie JWT (15min access + 30d
  refresh), silent refresh rotation, 6-digit email verification + password
  reset codes (Gmail SMTP)
- **Posts**: cursor pagination, create/edit/delete, cascade cleanup, photo
  posts, gradient backgrounds
- **Reactions**: like/love/haha/wow/sad/angry per-user map
- **Comments**: photo comments, likes, one-level replies, cascades
- **Share/repost** with caption, atomic shareCount
- **Hashtags + mentions**: server-side parsing, `/tag/:tag` feed, @name links
- **Post search**: `searchTerms` word index
- **Friends**: request/send/cancel/accept/decline/unfriend
- **Follow**: toggle follow/unfollow
- **Chat**: DMs + group chats, themes, admin member management, typing,
  unread counts — all realtime via Socket.io
- **Presence**: online/offline + lastSeen via socket connect/disconnect
- **Notifications**: REST history + socket push (`notification:new`)
- **Stories**: 24h auto-expiry via MongoDB TTL index
- **Reports**: auto-hide post at 3 reports
- **Security**: helmet, rate limiting, express-validator, bcrypt, httpOnly
  cookies, refresh cookie scoped to /api/auth

## Not yet (next sessions)

- Google OAuth sign-in (stubbed — needs google-auth-library on server)
- FCM/webpush sender (server can do it free with VAPID keys)
- Admin moderation dashboard
- Deploy: client → Vercel, server → Render, db → Atlas M0

## API quick map

```
POST /api/auth/register|login|logout|refresh|forgot|reset|send-verify-code|verify-email
GET  /api/auth/me
GET/POST /api/posts  PATCH/DELETE /api/posts/:id
PUT/DELETE /api/posts/:id/reaction   POST /api/posts/:id/share|report
GET  /api/posts/search?q=  /api/posts/tag/:tag  /api/posts/user/:id
POST /api/posts/batch {ids}
GET/POST /api/comments/:postId  PUT /api/comments/:id/like  DELETE /api/comments/:id
GET  /api/friends  /api/friends/status/:id  POST /api/friends/request/:id
POST /api/friends/accept/:id  DELETE /api/friends/request/:id  /api/friends/:id
GET  /api/users/:id  /api/users/search?q=  /api/users/suggested
PATCH /api/users/me  PUT /api/users/:id/follow  PUT /api/users/me/saved/:postId
GET  /api/chat/conversations  POST /api/chat/conversations (DM)
POST /api/chat/groups  PATCH /api/chat/conversations/:id (name/theme)
PUT/DELETE /api/chat/conversations/:id/members/:uid
GET/POST /api/chat/conversations/:id/messages  POST .../read
GET  /api/notifications  PUT /api/notifications/:id/read  /read-all
GET/POST /api/stories  DELETE /api/stories/:id
```

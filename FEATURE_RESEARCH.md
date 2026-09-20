# Netbook — Complete Feature Research & Implementation Reference

> Deep-researched from Meta's public docs (transparency.meta.com, engineering.fb.com,
> facebook.com/help, about.instagram.com) + the Backbook reference codebase.
> Every feature below explains **how Facebook/Instagram do it**, then how **Netbook**
> implements it end-to-end (UI → API → DB → realtime), and its status.

---

## 1. AUTHENTICATION

### How Facebook does it
Email/phone + password. Sessions via cookies; "remember me" keeps a long-lived
session. Login alerts notify on new-device sign-in. Optional 2FA. Password reset
sends a 6-digit code by email/SMS. Meta also offers "Continue with Facebook/Google"
OAuth on third-party sites (the OAuth2 Authorization Code + ID-token flow).

### Netbook implementation — ✅ COMPLETE
- **Register** `POST /api/auth/register` — validates name/email/password, bcrypt-hashes
  password (10 rounds), creates user, sends 6-digit email-verify code (Gmail SMTP,
  falls back to server console), sets httpOnly cookies.
- **Login** `POST /api/auth/login` — bcrypt compare → **15-min access JWT** +
  **30-day refresh JWT**, both httpOnly cookies (`SameSite=Lax`, `Secure` in prod,
  refresh scoped to `/api/auth`).
- **Silent refresh** — axios interceptor catches 401 → `POST /api/auth/refresh`
  (rotates the refresh token, old one invalidated via `refreshTokenHash`) → retries.
- **Email verification** — `/verify-email` page, 6-digit code, resend with cooldown,
  unverified users get a banner on every page.
- **Password reset** — 2-step flow: request code → enter code + new password.
- **Google OAuth** — Google Identity button → ID token → server verifies via
  `google-auth-library` against `GOOGLE_CLIENT_ID` → find-or-create user
  (Google emails auto-verified, avatar imported) → same cookie pair.
- **Logout** — clears both cookies + deletes refresh token hash server-side.

### Data flow
```
Client ──ID token──▶ POST /auth/google ──▶ OAuth2Client.verifyIdToken()
                                          │ audience = GOOGLE_CLIENT_ID
                                          ▼
                              User.findOrCreate(email)
                                          ▼
                    Set-Cookie: accessToken, refreshToken (httpOnly)
```

---

## 2. PROFILES

### How Facebook does it
Cover photo (wide banner), circular avatar overlapping it, name, bio/"Intro"
card (work, education, hometown, relationship, join date), photo grid of all
uploads, tabs: Posts / About / Friends / Photos. Crop+zoom editor on avatar/cover
upload. Profile-picture history is public — old avatars visible to anyone.

### Netbook implementation — ✅ COMPLETE
- `GET /users/:id` → profile with `canView` privacy flag + `followRequested`.
- `PATCH /users/me` — displayName, bio, isPrivate; photoURL/coverURL pushes
  entries into `photoHistory[]` (avatar|cover, timestamped) → **Photo Gallery**
  tab shows old photos with "Set as profile/cover" reuse menu.
- **CropDialog** — react-easy-crop: drag/zoom → canvas crop → blob → Cloudinary
  → URL → PATCH. Cover uses 16:5 aspect like FB.
- **Intro card** — bio, join date, friend/follower counts.
- Other users' profiles show Photos tab (public/gated).

---

## 3. POSTS

### How Facebook does it
Composer opens as a modal: "What's on your mind?" text, photo/video, feeling/
activity, colored background for text-only posts, audience selector
(Public / Friends / Only me / Custom), location tag, GIF picker. Feed posts show
author header, timestamp with privacy icon, content, reaction summary row,
Like/Comment/Share action row.

### Netbook implementation — ✅ COMPLETE (+ audience selector)
- `POST /posts` — server parses `#hashtags`, `@mentions` (resolved to uids via
  searchName), `searchTerms[]` for search index, validates ≤2000 chars.
- Types: plain text, photo (Cloudinary URL), gradient background post, shared
  embed. Emoji picker (emoji-mart, inserts at cursor). Live background preview.
- **Audience selector**: `visibility: 'public'|'friends'|'followers'|'onlyme'`
  — enforced server-side in feed + profile queries.
- Edit (owner only) → `PATCH /posts/:id`, re-parses hashtags/mentions.
- Delete (owner) → cascades comments + notifications in one transaction.
- Infinite scroll: cursor = last post's `createdAt`, `?cursor=` param, 10/page.

---

## 4. REACTIONS

### How Facebook does it
Long-press (mobile) or hover (desktop) on Like → animated picker floats up with
6 reactions: Like 👍, Love ❤️, Haha 😂, Wow 😮, Sad 😢, Angry 😡 — each bounces
and grows on hover. The button label/color changes to your reaction. The count
row shows top-3 reaction icons + total; clicking it opens a sheet listing who
reacted, filterable by type.

### Netbook implementation — ✅ COMPLETE
- `PUT /posts/:id/reactions` — one reaction per user, `reactions: Map<uid, type>`,
  `likes` array kept in sync for counts.
- Hover→picker (250ms grace), long-press on touch, spring-scale animation on pick.
- Summary row: top-3 emoji + count → **ReactionsDialog** lists reactor
  name+avatar+emoji (`GET /users/basic?ids=`).

---

## 5. COMMENTS

### How Facebook does it
Nested replies (1 level visually threaded), comment likes, photo/GIF comments,
"View more comments" pagination, author badge, timestamps, most-relevant
ordering (top comments first on FB).

### Netbook implementation — ✅ COMPLETE
- `POST /posts/:id/comments` — text and/or imageURL; atomically bumps
  `post.commentCount`; notifies post owner + mentioned users.
- Replies: `parentComment` field → 1-level thread; reply notifies parent author.
- `PUT /comments/:id/like` — toggle in `likes[]`.
- Edit/delete own comments; delete decrements count.
- Newest-first pagination (10/page).

---

## 6. SHARING

### How Facebook does it
"Share" opens a sheet: Share now (no caption) or Write a caption → post appears
in your feed with an embedded bordered card of the original (author, excerpt,
thumbnail). Original post's share count increments; owner gets a notification.

### Netbook implementation — ✅ COMPLETE
- `POST /posts/:id/share { caption }` → creates a new post with `sharedFrom`
  embedded snapshot {id, displayName, text, imageURL, createdAt} — frozen copy
  survives original edits/deletes.
- Embed card links to `/post/:id`; `shareCount` atomic increment + notification.

---

## 7. STORIES

### How Instagram does it
Full-screen tap-through viewer, 5s auto-advance per story, progress bars at top,
gradient ring around avatars with unseen stories (grey when seen), 24h expiry,
swipe-up → **viewers list** (who + when, visible 48h), reply-to-story → DM,
close-friends audience option.

### Netbook implementation — ✅ COMPLETE (+ viewer list)
- `POST /stories` — imageURL (Cloudinary), `expiresAt = now+24h`, **Mongo TTL
  index** auto-deletes.
- `GET /stories` — grouped by user; **private accounts' stories only visible to
  followers/friends** (server filter).
- StoryViewer: progress bars, auto-advance, prev/next arrows, owner badge.
- **Viewers**: each view records `{user, at}` in `viewedBy[]`; owner sees the
  viewers list in the viewer (swipe-up equivalent = viewers button).

---

## 8. FRIENDS (two-way) & FOLLOWS (one-way)

### How Facebook does it
**Friend request** = symmetric: send → recipient accepts/declines → both appear
in each other's friends list. "Not Now" hides without declining. Unfriend
removes both sides.
**Follow** = asymmetric: you see their public posts without friendship. On FB,
everyone's public posts are followable; on **Instagram**, private accounts turn
Follow into a **follow request** — approve → they follow you; decline → they
see nothing (posts, stories, photo grid all locked).

### Netbook implementation — ✅ COMPLETE (both systems)
- `FriendRequest` doc {from, to, type:'friend'|'follow', status}.
- Friends: `POST /friends/request/:id` → accept adds each to the other's
  `friends[]` atomically + 'friend_accept' notification; decline/cancel deletes.
- Follow (public): `PUT /users/:id/follow` → instant `followers[]`/`following[]`
  + 'follow' notification.
- Follow (private): same endpoint detects `isPrivate` → creates type='follow'
  request + 'follow_request' notification → recipient sees **Accept/Decline**
  buttons in Notifications → accept adds follower + 'follow_accept' notif;
  second tap on "Requested" cancels.
- **Remove follower**: `DELETE /users/:id/follower` — removes them from your
  followers (they lose private access without unfriending).

---

## 9. PRIVATE ACCOUNTS & AUDIENCE

### How Instagram/Facebook do it
Private toggle in Settings → all posts/stories/photos gated behind follower
approval; profile shows lock state; followers-only comment restrictions.
FB per-post audience: Public / Friends / Only me / Custom.

### Netbook implementation — ✅ COMPLETE
- `User.isPrivate` → Edit Profile switch.
- Server-side gating everywhere (never trust the client):
  - `GET /posts` feed — filters private authors you don't follow
  - `GET /posts/user/:id` — 403 `{private:true}` → UI shows lock card
  - `GET /stories` — private stories hidden from non-followers
  - `GET /users/:id` — `canView` flag + strips photoHistory when locked
- Post `visibility` audience enforced in the same filters.

---

## 10. FEED & RANKING

### How Facebook does it
4-stage ML pipeline: (1) inventory — gather candidate posts from friends,
follows, groups (~1000+); (2) signals — who posted, type, your history with
them, friend engagement; (3) predictions — P(you comment), P(share), dwell
time; (4) score + diversify post types. Friends-tab is recency-only.

### Netbook implementation — ✅ student-scale equivalent
- **For You**: recency feed of all visible posts (privacy-filtered), cursor
  pagination.
- **Following**: filter to `following[]` only — matches FB's Friends feed.
- Honest scope note: real ranking needs engagement signals + ML; our
  recency+following split is the classic clone approach. Cheap upgrade path:
  score = recency − decay + w₁·comments + w₂·unique reactors.

---

## 11. SEARCH

### How Facebook/Instagram do it
Top nav search → instant dropdown of people/pages/groups, full results page
with tabs (All/People/Posts), search history persisted with one-tap remove,
recent-first ordering.

### Netbook implementation — ✅ COMPLETE
- `GET /users/search?q=` — prefix match on lowercase `searchName` (indexed).
- `GET /posts/search?q=` — substring over `searchTerms[]`; `/tag/:tag` feed.
- `searchHistory[]` (max 10, deduped, newest first) → chips on Explore with
  **× remove** → `DELETE /users/me/search-history/:term`.
- Clicking a user result records the search term.

---

## 12. NOTIFICATIONS

### How Facebook does it
Bell icon with unread badge → dropdown of recent items (actor avatar, action
text, thumbnail, timestamp, blue dot unread) → click marks read + deep-links.
Grouped (10 likes = 1 notification). Push via FCM/web-push for offline users.

### Netbook implementation — ✅ COMPLETE (push stubbed)
- `Notification` doc {recipient, sender snapshot, type, postId?, postText?}.
- Server creates + `socket.emit('notification:new')` → live badge bump, no
  refresh needed.
- Page: unread = blue left-border highlight; mark-one on click; mark-all button.
- Types: like, comment, reply, share, follow, follow_request (with inline
  Accept/Decline), follow_accept, friend_request, friend_accept, mention,
  message.
- `PUT /users/me/fcm` stores device tokens (send pipeline = future work).

---

## 13. MESSAGING

### How Messenger does it
Conversation list (avatar, name, last-message preview, unread dot, online dot)
→ thread: bubbles right/left, emoji react on messages, **sent ✓ / delivered ✓✓
/ seen (avatar)** receipts, typing "...", photo/emoji/GIF attachments, group
chats with named admins, rename, add/remove members, themes/colors, message
requests from strangers, **unsend for everyone** (or for you), edit within 15min.

### Netbook implementation — ✅ COMPLETE (unsend + reactions added)
- `Conversation` {members[], isGroup, name, theme, admin, lastMessage, readBy[]}.
- `Message` {conversation, sender, text, imageURL, read, reactions: Map}.
- Socket.io rooms: `message:new`, `message:seen`, `typing`, `user:online`.
- Seen: opening a chat → `POST /chat/:id/seen` marks all read → '✓✓ Seen' under
  your last message + live updates both sides.
- Typing: emit on keystroke, debounced clear.
- Group: create with member picker, admin-only rename/add/remove, theme colors.
- **Unsend**: `DELETE /chat/messages/:id` (sender only) → 'message:deleted'
  socket → bubble removed on both sides.
- **Message reactions**: `PUT /chat/messages/:id/react` — long-press/hover emoji.
- Presence: `isOnline` socket map + `lastSeen` timestamp fallback.

---

## 14. UI / UX SYSTEM

### Facebook's actual design system (applied)
- Canvas `#F0F2F5`, cards `#FFFFFF` 8px radius, shadow `0 1px 2px rgba(0,0,0,.1)`
- Dark: canvas `#18191A`, cards `#242526`, hover `#3A3B3C`
- Meta Blue `#0866FF`, ink `#050505`/`#E4E6EB`, Segoe UI stack
- 3-zone sticky nav: logo+search | center icon tabs w/ underline | actions
- Left rail: avatar row + colored icon chips; composer = pill input

### Netbook implementation — ✅ COMPLETE
- `theme.js` = full token set above, both modes, component overrides.
- Skeleton loaders (post/profile) while loading; ErrorBoundary per route;
  EmptyState for zero-data; OptimizedImage lazy-loads.
- Mobile: bottom nav bar, responsive breakpoints, touch-friendly targets.
- Framer-motion page transitions + reaction micro-animations.

---

## 15. MODERATION & SAFETY

### How Facebook does it
Report → review queue → Community Standards enforcement; repeat-reported
content gets reduced distribution; users can block.

### Netbook implementation — ✅ COMPLETE
- `POST /posts/:id/report` → `Report` doc + `reportCount++` → **≥3 reports
  auto-hides** the post (hidden flag) pending review.
- Private accounts + audience controls = user-side moderation.
- Rate limiting (500 req/15min global, tighter on auth), helmet headers,
  express-validator on all inputs.

---

## FEATURE COVERAGE MATRIX

| Feature | FB/IG | Netbook | Status |
|---|---|---|---|
| Email auth + JWT cookies | ✓ | ✓ | Done |
| Email verify + reset codes | ✓ | ✓ | Done |
| Google OAuth | ✓ | ✓ | Done |
| Posts (text/photo/bg) | ✓ | ✓ | Done |
| Audience selector | ✓ | ✓ | Done |
| 6 reactions + picker | ✓ | ✓ | Done |
| Who-reacted list | ✓ | ✓ | Done |
| Comments + replies + photos + likes | ✓ | ✓ | Done |
| Share w/ caption | ✓ | ✓ | Done |
| Stories 24h + rings + viewers | ✓ | ✓ | Done |
| Friends (request/accept/unfriend) | ✓ | ✓ | Done |
| Follow + private approval | ✓ | ✓ | Done |
| Remove follower | ✓ | ✓ | Done |
| Private accounts (full gating) | ✓ | ✓ | Done |
| Search + history + remove | ✓ | ✓ | Done |
| Realtime notifications | ✓ | ✓ | Done |
| Push notifications | ✓ | ◐ | Token storage only |
| DMs + groups + themes + admin | ✓ | ✓ | Done |
| Seen/delivered receipts | ✓ | ✓ | Done |
| Typing + presence | ✓ | ✓ | Done |
| Message unsend + reactions | ✓ | ✓ | Done |
| Dark mode + responsive | ✓ | ✓ | Done |
| Reports + auto-hide | ✓ | ✓ | Done |
| Hashtags/mentions/tag feed | ✓* | ✓ | Done |
| Saved posts | ✓ | ✓ | Done |

### Intentionally out of scope (not student-implementable for free)
| Feature | Why skipped |
|---|---|
| Reels/video posts | needs transcoding pipeline + CDN — Cloudinary free tier covers images only realistically |
| Marketplace, Pages, Groups-as-communities | separate product surfaces, not feed features |
| Live video | needs RTMP/WebRTC infra |
| Ads, monetization | n/a |
| Real ML ranking | needs behavioral data + model serving |
| 2FA / multi-device sessions | feasible but low demo value vs effort |
| Message requests folder | our private-follow gate covers the same intent |
| Vanish mode, Notes, Broadcast channels | IG extras — could add Notes easily if wanted |

---
*FB supports hashtags/mentions too — just less central than IG/Twitter.

# Netbook — Complete UI Design Specification

> Hand this file to any LLM/designer to understand or redesign the UI.
> Current design language: **Meta/Facebook web (2024)** with Instagram-style stories.
> Stack: **React 18 + Vite, Material UI v6 (theme-driven), Tailwind CSS v4 (utility classes), Framer Motion, emoji-mart, react-easy-crop**.

---

## 1. DESIGN TOKENS (`client/src/theme.js`)

### Colors — Meta's real tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| Canvas (page bg) | `#F0F2F5` | `#18191A` | body / app background |
| Surface (cards) | `#FFFFFF` | `#242526` | Paper, Card, dialogs |
| Ink (primary text) | `#050505` | `#E4E6EB` | headings, body |
| Ink-2 (secondary text) | `#65676B` | `#B0B3B8` | captions, timestamps, icons |
| Divider | `#CED0D4` | `#3E4042` | borders, separators |
| Hover/input fill | `#F0F2F5` | `#3A3B3C` | icon hover bg, input bg |
| Disabled text | `#8A8D91` | `#6E7174` | |
| **Primary blue** | `#0866FF` | `#0866FF` | Meta Blue — buttons, links, active tab underline |
| Primary hover | `#0055D4` | `#0055D4` | button hover |
| Secondary | `#7c3aed` | `#7c3aed` | accents |
| Error | `#F02849` | `#F02849` | love reaction, errors, reels icon |
| Success | `#31A24C` | `#31A24C` | friends icon, close friends star |

### Typography
- Font stack: `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif` (Facebook's actual font)
- Headings h1–h6: `font-weight 700`, h1–h3 have negative letter-spacing (`-0.02em`/`-0.01em`)
- `body1`: `0.9375rem` / line-height 1.33 (FB's 15px)
- `body2`: `0.8125rem` / 1.31
- Buttons: `text-transform: none`, weight 600, `0.9375rem`

### Shape & elevation
- Card radius: **8px** (`shape.borderRadius`)
- Buttons radius: **6px**
- Dialog radius: **12px**
- Inputs: radius 8, filled background (`input` token), transparent border → divider on hover → blue on focus
- Card shadow: `0 1px 2px rgba(0,0,0,0.1)` (elevation 1 — the only shadow used on feed cards)
- Deeper: `0 2px 8px rgba(0,0,0,0.12)` menus/popovers

### Utility classes (`index.css`)
- `.gradient-primary` — `linear-gradient(135deg, #0866FF, #0055D4)` (logo)
- `.gradient-accent` — `#0866FF → #00C6FF`
- `.story-ring` — IG gradient ring: `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)` + 3px padding
- `.shadow-card` — the 1px-2px card shadow
- `.animate-fade-in` — 0.5s fade+rise
- Scrollbar: 8px, `#94a3b8` thumb on `#f1f5f9` track

### Dark mode
- `.dark` class on `<html>` toggled by `ThemedApp`/`uiSlice`; MUI `palette.mode` + Tailwind `dark:` variant both keyed off it

---

## 2. APP LAYOUT (`components/layout/AppLayout.jsx`)

```
┌─────────────────────────────────────────────────────┐
│ Navbar (sticky, 56px, surface, 1px bottom shadow)   │
├──────────┬──────────────────────────┬───────────────┤
│ Sidebar  │  Main (max-w inside      │  RightRail    │
│ w-64     │  flex-1, p-4)            │  w-80, lg+    │
│ md+ only │                          │  only         │
│          │                          │               │
│ nav      │  page content            │  "People you  │
│ + ⚙️     │  (per-page max-widths:   │  may know"    │
│ Settings │   feed/others max-w-2xl) │  + Add friend │
└──────────┴──────────────────────────┴───────────────┘
│ BottomNav (fixed, md:hidden) — Home/Explore/Reels/Chat/Profile │
└─────────────────────────────────────────────────────┘
Container: max-w-7xl mx-auto
```

---

## 3. COMPONENT SPECS

### Navbar (`Navbar.jsx`) — Facebook 3-zone
- Left: `gradient-primary` rounded "N" logo (40px) + pill search input `Search Netbook` (bg=input token, radius full, no border, Enter→`/explore?q=` or `/tag/x` for `#`)
- Center (md+): icon tabs — Home, Explore, Chat — grey icons, active = Meta blue + **2px blue underline bar** at bottom edge
- Right: circular icon buttons (bg=input token, 40px): Notifications bell w/ unread badge, Chat, avatar → menu (avatar+name header, "Edit profile", "Dark mode" switch, Logout)
- Height 56px, `position: sticky`, shadow `0 1px 2px rgba(0,0,0,.1)`

### Left Sidebar (`Sidebar.jsx`)
- Transparent Paper, no card look
- Row 1: own avatar (32px) + displayName (bold 15px)
- Nav rows: 32px circular colored icon chip (`bgcolor: ${color}20` = 12% tint, icon colored) + label 15px/500; selected = tinted row bg; radius 8
- Colors per item: Home `#0866FF`, Explore `#00C6FF`, Chat `#A033FF`, Notifications `#F02849`, Reels `#F02849`, Saved `#F7B928`, Friends `#31A24C`
- Bottom-pinned **Settings** row → dialog with switches: Dark mode, Private account, Close-friends manager (friend list + toggles)

### RightRail (`RightRail.jsx`) — NEW
- "People you may know" header (subtitle2, grey 600)
- Rows: 36px avatar + name (truncate) + "Suggested" caption + **FriendButton** (Add friend/Request sent/Accept-Decline/Friends)
- "See all" text-button → /explore

### CreatePost (`components/post/CreatePost.jsx`) — FB composer
- White card, avatar + pill input `"What's on your mind, {firstName}?"` — radius 999, bg=input token
- Action row (centered, equal spacing): 📷 Photo (green) · 🎥 Video/Reel (rose, ≤5min) · 🎨 Background (palette) · 😊 Emoji (emoji-mart popover)
- Image/video preview with X remove; background gradient preview (8 preset gradients)
- Audience dropdown (outlined pill button): Public 🌐 / Friends 👥 / Close friends ⭐ / Only me 🔒
- Post button: contained blue, radius pill, disabled until content

### PostCard (`components/post/PostCard.jsx`)
- Card: surface, radius 8, `shadow-card`, `mb-4`
- Header: avatar 40px (→profile) + name (bold, hover underline) + caption row = timestamp + audience icon (👥/🔒 when not public) + "· Edited"; right = ··· menu (Edit/Delete own; Save/Report others)
- Background posts: gradient fill, white 24px bold text, centered, min-height
- Shared posts: bordered inner card with original author/excerpt/thumbnail → `/post/:id`
- Media: full-width image (lazy `OptimizedImage`, max-h ~300) or `<video controls>` max-h-96 bg-black
- Summary row: stacked top-3 reaction emoji + total count (→ ReactionsDialog) left; "N comments · N shares" right
- Action row: 3 equal-width buttons (Like=thumb / Comment / Share) — grey text, hover bg=input token; active reaction shows its color+label
- Reactions: hover/long-press Like → floating picker, 6 emoji 👍❤️😂😮😢😡, spring scale on pick (framer-motion)
- Comment section: input + list; replies nested 1 level; comment like ♥, photo comments, "View more" pagination

### StoryBar (`components/post/StoryBar.jsx`)
- Horizontal scroll row: "Your story" tile first (avatar + blue + badge), then per-user tiles
- Tile: `.story-ring` gradient around avatar + name below
- Click "+" → audience dialog: preview image + buttons **Everyone** / **★ Close friends** (green outlined)
- **Viewer**: full-screen black Dialog; progress bars top (5s each, white on white/30); header = avatar+name+timeAgo; **X close** (always visible, `bg-black/50`); **‹ › arrows** always visible both sides (jump between users' groups too); **tap zones** — left third = prev, right two-thirds = next; owner sees bottom pill `👁 N views`

### Feed (`pages/home/Feed.jsx`)
- Tabs: **For You / Friends / Close Friends**
- StoryBar → CreatePost → PostCard list; skeleton loaders; infinite scroll via IntersectionObserver sentinel; EmptyState with icon+title+description

### Reels (`pages/home/Reels.jsx`)
- `max-w-md` column, `h-[calc(100dvh-96px)]`, `snap-y snap-mandatory` scroll
- Each reel: black bg, video `object-contain`, autoplay at 60% visibility (IntersectionObserver), loop, tap toggles mute
- Bottom overlay (gradient `black/70 → transparent`): avatar+name (→profile) + caption + **FriendButton**; right rail of icons: ❤️ like+count, 💬 comments (→post detail), 🔊 mute

### Chat (`pages/chat/ChatRoom.jsx`)
- 2-pane: conversation list (w-80, avatar+name+last msg+unread badge+online dot) | thread
- Bubbles: mine = theme color bg/white text rounded-2xl right; theirs = surface left; group shows sender name
- Bubble hover → ··· button → pill menu: 6 quick reactions ❤️😂👍😮😢🙏 + unsend 🗑 (own msgs); double-click = ❤️; reaction chips under bubble
- Receipts: `✓ Sent` / `✓✓ Seen` (blue) under my last message
- Typing "X is typing..." caption; header shows Online / Last seen
- Group settings dialog: rename (admin), theme swatches (8 colors), member list w/ admin remove

### Profile (`pages/profile/Profile.jsx`)
- Cover photo 16:5-ish (w-full h-48 md:h-64, camera button own-profile → crop 16:5)
- Avatar 120px, `-mt-16` overlap, white 4px ring; camera → crop 1:1 (react-easy-crop + zoom slider)
- Name h4 bold; bio; stats row: **Posts | Friends**
- Actions: own = Edit Profile; other = FriendButton + Message + Report
- Private & non-friend: 🔒 lock card "This account is private — only friends can see…"
- Tabs: Posts / Photos (grid, click→dialog, own photos get "Set as pfp/cover" menu) / About (bio, joined date)

### Notifications (`pages/home/Notifications.jsx`)
- Rows: avatar + bold name + action text + post excerpt + timeAgo + type icon (❤️ red, 💬 blue, 👤 purple/green)
- Unread = `bg-blue-50` + 4px blue left border; click → mark read + navigate (friend_request→/friends, posts→/post/:id, else→profile)
- "Mark all read" button when unread>0; realtime badge via socket

### Friends page (`pages/home/Friends.jsx`)
- Tabs: Requests received (Accept/Decline) / Sent (Cancel) / All friends (Unfriend menu)
- Each row: avatar, name, action buttons

### Skeletons (`components/common/SkeletonLoader.jsx`)
- PostSkeleton: avatar circle + 2 text bars + image rect (MUI Skeleton, wave anim)
- ChatSkeleton, ProfileSkeleton; shimmer while loading

---

## 4. INTERACTION PATTERNS
- Toasts: top-right Snackbar (`showSuccess`/`showError`/`showInfo` utils)
- Page transitions: framer-motion fade+slide (AnimatePresence in AppLayout)
- Icons: `@mui/icons-material` exclusively; action icons get aria-labels
- Hover language: `hover:bg-black/5 dark:hover:bg-white/5` for rows; scale-110 on avatar/cover cameras
- No global card hover-scale (removed — not FB-like)

## 5. FILES MAP
```
client/src/
  theme.js                    ← all tokens above
  index.css                   ← utilities, scrollbars, dark variant
  components/layout/          Navbar, Sidebar, RightRail, AppLayout, BottomNav
  components/post/            CreatePost, PostCard, StoryBar, CommentSection, PostText
  components/common/          FriendButton, CropDialog, EmptyState, ErrorState,
                              OnlineStatusDot, OptimizedImage, SkeletonLoader
  pages/home/                 Feed, Explore, Reels, Notifications, Saved, Friends, TagFeed, PostDetail
  pages/profile/              Profile, EditProfile
  pages/chat/ChatRoom.jsx
  pages/auth/                 Login, Register, ForgotPassword, VerifyEmail
```

## 6. KNOWN WEAK SPOTS (improvement targets)
- Feed cards could use FB's tighter 590px column (`max-w-[590px]`) and whitespace rhythm
- No hovercards on avatars/names
- Story tiles are circles — FB uses tall rounded rect tiles w/ cover image
- Reels: no double-tap-to-like heart burst, no progress bar on video
- Chat bubbles lack Messenger's tail/gradient themes
- No skeleton shimmer on right rail / notifications
- Login/Register pages are plain — no FB-style left marketing panel
- Mobile: no pull-to-refresh, story bar not edge-to-edge

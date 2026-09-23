# Deployment & Production Notes

How Netbook goes from code on a laptop to a live service — and why each
piece exists.

## The pipeline (build → deploy)

```
git push → CI (lint + test + build) → build artifacts → deploy → health check → live
```

### 1. CI — Continuous Integration (`.github/workflows/ci.yml`)

Every push/PR runs GitHub Actions:

- `npm ci` — clean, reproducible install from the lockfile (never `npm install` in CI)
- `npm run lint` — style/bug gate
- `npm test` — vitest unit tests
- `npm run build` — proves the production bundle compiles

If any step fails, the commit is marked red and the PR is blocked.
This answers "how do you stop broken code reaching production?"

### 2. Docker — identical environments everywhere

`server/Dockerfile` — node:20-alpine, `npm ci --omit=dev`, non-root user.
Key ideas interviewers probe:

- **Layer caching** — `package.json` copied before source, so dependency
  install only re-runs when deps change, not every code edit
- **Small image** — alpine base (~130MB) = faster pulls, smaller attack surface
- **Non-root** — the container runs as `node`, not root (security)
- **`.dockerignore`** — keeps node_modules, .env, .git out of the image

`client/Dockerfile` — **multi-stage build**: stage 1 runs `vite build`,
stage 2 is a ~25MB nginx image holding only `dist/`. The node build
environment never ships to production.

`docker-compose.yml` — the whole stack (mongo + server + client+nginx)
with one command. `client/nginx.conf` reverse-proxies `/api` and
`/socket.io` to the server container, so the browser sees a single
origin — same trick as the Vite dev proxy.

### 3. Latency — where time is spent

Netbook's latency story, in order of impact:

| Technique | Where | Effect |
|---|---|---|
| Cursor pagination | `/api/posts` | No `skip(n)` — Mongo scans n docs per page; cursor reads only the page |
| DB indexes | `searchTerms`, `user`, `createdAt` | O(log n) lookups instead of collection scans |
| `.lean()` | read-only queries | Plain JS objects, ~30% faster + less memory than Mongoose docs |
| `compression` middleware | every response | ~70% smaller JSON/HTML payloads |
| Optimistic updates | reactions, likes | UI responds in ~0ms; server confirms in background |
| HTTP caching | nginx `/assets/` | Hashed Vite files cached 1 year — repeat visits load instantly |
| CDN (Cloudinary) | all media | Images/video served from edge nodes near the user |
| Connection reuse | Socket.io + HTTP keep-alive | One socket instead of polling every N seconds |

The classic interview framing: **"how would you make the feed fast at
10k users?"** → pagination + indexes + CDN + caching headers +
lazy-loading media. You can name every one of those in this codebase.

### 4. Deploying for real (free tiers)

- **Client** → Vercel / Netlify / Firebase Hosting — `vite build` output,
  or the Docker image on any container host
- **Server** → Render / Railway / Fly.io — Docker or `npm start`,
  env vars set in the dashboard (never in the image)
- **DB** → MongoDB Atlas M0 — already in use
- Zero-downtime-ish: Render health-checks `/api/health` before routing
  traffic to the new deploy

### 5. Secrets discipline

- `.env` is gitignored — the repo only has `.env.example` templates
- CI passes secrets via GitHub Secrets; compose reads them from the shell env
- JWTs live in httpOnly cookies, refresh cookie scoped to `/api/auth`
- bcrypt password hashing, helmet headers, express-rate-limit on `/api`

## Common interview questions

**"How does your CI/CD work?"**
Push → GitHub Actions runs lint + tests + build → on green, deploy.
Bad commits never reach production.

**"Why Docker? What did it solve for you?"**
Identical runtime everywhere — dev machine, CI, and server all run the
same image. No "works on my machine." Also makes deploys reproducible
and rollback = redeploy the previous image.

**"How do you handle database scaling?"**
Atlas handles replication; on the app side: indexes on hot query fields,
cursor pagination, `.lean()` reads, and Map fields flattened for JSON.
Next step would be Redis caching for the feed and read replicas.

**"What happens if the server crashes?"**
Process exits → the platform (Render/Docker) restarts it. Stateless
design helps: sessions are JWTs in cookies, not server memory — any
instance can serve any user. Socket.io reconnects automatically.

**"How do you do zero-downtime deploys?"**
Health-check endpoint (`/api/health`) — platform routes traffic only
after the new instance answers. Old instance drains, then stops.

**"Monolith or microservices — why?"**
Modular monolith: controllers/routes/models cleanly separated, but one
deployable. Microservices add network latency + operational overhead a
project this size doesn't need. If chat became huge it could split out —
the socket layer is already isolated.

**"How is it secured?"**
httpOnly cookies (XSS can't read tokens), CSRF-safe because SameSite
cookies + JSON API, bcrypt, helmet, rate limiting, express-validator,
server-side privacy enforcement on every content query.

**"What's the latency of your feed endpoint?"**
One indexed query, cursor-paginated to ~10 docs, `.lean()` objects —
tens of ms server-side. The visible speed comes from optimistic UI +
CDN media + immutable asset caching.

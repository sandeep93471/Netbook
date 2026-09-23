# ── Netbook API server ──────────────────────────────────────────────
# Multi-stage isn't needed (no build step) — keep it lean:
# node:20-alpine ≈ 130MB vs ~1GB for the full image.
FROM node:20-alpine

# Run as non-root for security — node image ships a 'node' user
WORKDIR /app

# Copy manifests first → layer cache: deps only reinstall when package*.json changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Then the source — changes here don't invalidate the deps layer
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

USER node
CMD ["node", "server.js"]

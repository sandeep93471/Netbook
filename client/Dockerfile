# ── Netbook client — build stage ────────────────────────────────────
# Vite outputs static files; we don't ship node_modules to production.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_* vars are baked into the bundle at build time
ARG VITE_API_URL=""
ARG VITE_CLOUDINARY_CLOUD_NAME=""
ARG VITE_CLOUDINARY_UPLOAD_PRESET=""
ARG VITE_GOOGLE_CLIENT_ID=""
RUN npm run build

# ── Serve stage — nginx static hosting ≈ 25MB total ─────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

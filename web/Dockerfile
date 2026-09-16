# syntax=docker/dockerfile:1
# The journal web app. Build context is web/, not the repo root.

# --- deps: install once, cached on the lockfile alone ------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build -------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Required to be present at build time; never used. The real value arrives at runtime.
ENV AUTH_SECRET=build-only-not-a-real-secret \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Static assets and public/ are emitted outside .next/standalone and have to be
# copied separately.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Next writes its optimized-image cache here at runtime. COPY lands as root, so
# without this the unprivileged user cannot create it — and the failure is an
# unhandled rejection on the request that tried, not a warning.
RUN mkdir -p .next/cache && chown -R node:node /app/.next

USER node
EXPOSE 3000
CMD ["node", "server.js"]

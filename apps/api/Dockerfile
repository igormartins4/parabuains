# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

RUN npm install -g pnpm@9.15.0

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ─── Development ──────────────────────────────────────────────────────────────
FROM base AS dev
ENV NODE_ENV=development

WORKDIR /app

# Re-install with full workspace for dev (tsx watch needs all deps)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source (overridden by Docker Compose Watch bind mounts in dev)
COPY packages/db ./packages/db
COPY apps/api ./apps/api

EXPOSE 3001

CMD ["pnpm", "--filter", "@parabuains/api", "dev"]

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/db ./packages/db
COPY apps/api ./apps/api

RUN pnpm --filter @parabuains/db build 2>/dev/null || true
RUN pnpm --filter @parabuains/api build

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]

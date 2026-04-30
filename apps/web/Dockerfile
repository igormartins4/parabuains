# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

RUN npm install -g pnpm@9.15.0

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# ─── Development ──────────────────────────────────────────────────────────────
FROM base AS dev
ENV NODE_ENV=development

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copy source (overridden by Docker Compose Watch bind mounts in dev)
COPY packages/db ./packages/db
COPY apps/web ./apps/web

EXPOSE 3000

CMD ["pnpm", "--filter", "@parabuains/web", "dev"]

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM deps AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

COPY packages/db ./packages/db
COPY apps/web ./apps/web

RUN pnpm --filter @parabuains/web build

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["pnpm", "--filter", "@parabuains/web", "start"]

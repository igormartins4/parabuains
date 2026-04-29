# Phase 1: Foundation & Infrastructure — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions pre-agreed by developer)

<domain>
## Phase Boundary

Phase 1 delivers a running monorepo with the complete stack scaffolded end-to-end:
- Turborepo monorepo with two apps (`web`, `api`) and one shared package (`db`)
- Next.js 16 scaffolded with App Router and Tailwind v4
- Fastify v5 scaffolded with Clean Architecture folder structure and all plugins registered
- Complete Drizzle ORM schema (all tables for all 7 phases) with migrations running
- Redis + BullMQ connected; notification worker process boots without errors
- GitHub Actions CI pipeline: lint + type-check + tests, pnpm cache
- Swagger/OpenAPI accessible at `/docs` in development

**NOT in Phase 1:**
- Auth logic of any kind (better-auth wired in Phase 2)
- Business logic or feature endpoints
- Avatar upload / storage (Phase 3)
- Deploy target configuration (decided later)
- Any frontend UI pages or components

</domain>

<decisions>
## Implementation Decisions

### D-01: Monorepo Tool — Turborepo
Use **Turborepo** (not Nx). pnpm workspaces as the package manager protocol.

### D-02: Package Manager — pnpm
Use **pnpm** throughout (pnpm workspaces, `pnpm-workspace.yaml`). No npm or yarn.

### D-03: Monorepo Structure (exact)
```
parabuains/
├── apps/
│   ├── web/          ← Next.js 16 (App Router + Tailwind v4)
│   └── api/          ← Fastify v5 (Clean Architecture)
├── packages/
│   └── db/           ← Drizzle schema + migrations (shared package)
├── turbo.json
├── pnpm-workspace.yaml
└── .github/workflows/ci.yml
```

### D-04: Fastify Module Structure (exact)
```
apps/api/src/
├── plugins/            ← Fastify plugins (helmet, cors, rate-limit, jwt, swagger)
├── modules/
│   ├── users/
│   ├── friendships/
│   ├── messages/
│   └── notifications/
├── infrastructure/     ← DB connection, Redis client, BullMQ setup
├── shared/             ← Types, errors, utilities
└── app.ts              ← Fastify instance factory
```

Each module follows: `routes.ts` + `service.ts` + `repository.ts` + `schemas.ts`

### D-05: Complete DB Schema in Phase 1
All tables delivered in Phase 1 (schema only — no business logic):
- `users` — core identity with TOTP, timezone, privacy_level, soft delete
- `oauth_accounts` — Google + Twitter/X provider accounts
- `friendships` — bilateral with status (pending/accepted/blocked)
- `wall_messages` — public/private/anonymous with soft delete
- `notification_preferences` — per user per channel (email/push)
- `push_subscriptions` — Web Push VAPID endpoints
- `notification_log` — idempotency + audit, unique per (recipient, subject, channel, reminder_type, year)
- `audit_logs` — actor, action, resource, ip_address, user_agent, metadata

Drizzle migrations must run cleanly (`drizzle-kit push` in dev).

### D-06: CI Platform — GitHub Actions
`.github/workflows/ci.yml` runs on push/PR to main:
- pnpm cache (using `pnpm/action-setup` + `actions/cache`)
- `pnpm lint` (ESLint)
- `pnpm type-check` (tsc --noEmit)
- `pnpm test` (Vitest)

### D-07: Testing Framework — Vitest
Use **Vitest** (not Jest). Phase 1 only needs the framework configured and one smoke test per app to prove the pipeline works.

### D-08: Fastify Plugins to Register (Phase 1)
All registered at startup in `plugins/` — no auth logic yet:
- `@fastify/helmet` — security headers
- `@fastify/cors` — CORS (allow Next.js origin)
- `@fastify/rate-limit` — rate limiting (Redis store)
- `@fastify/jwt` — JWT plugin registered (not enforced until Phase 2)
- `@fastify/swagger` + `@fastify/swagger-ui` — OpenAPI at `/docs`
- `@fastify/sensible` — HTTP error helpers
- `pino-pretty` in development only

### D-09: Exact Package Versions (per STACK.md research)
```
Next.js: 16.2.4
Fastify: 5.8.5
TypeScript: 6.0.3
Drizzle ORM: 0.45.2
drizzle-kit: 0.31.10
pg: 8.20.0
ioredis: 5.10.1
BullMQ: 5.76.4
better-auth: 1.6.9 (schema only — no auth wiring in Phase 1)
Zod: 4.3.6
Pino: 10.3.1
pino-pretty: 13.1.3
@fastify/helmet: 13.0.2
@fastify/rate-limit: 10.3.0
@fastify/cors: 11.2.0
@fastify/jwt: 10.0.0
@fastify/swagger: 9.7.0
@fastify/swagger-ui: 5.2.6
fastify-plugin: 5.1.0
web-push: 3.6.7 (installed, not configured in Phase 1)
Resend: 6.12.2 (installed, not configured in Phase 1)
@react-email/components: 1.0.12 (installed, not configured in Phase 1)
Tailwind CSS: 4.2.4
@tanstack/react-query: 5.100.6
```

### D-10: Deploy Target — Deferred
Do NOT include Dockerfile, Railway config, Fly.io config, or any deploy tooling in Phase 1. Decided in a later phase.

### D-11: Avatar Storage — Deferred
Do NOT include avatar upload in Phase 1. Decided in Phase 3.

### the agent's Discretion
- `.env.example` format and env var naming
- ESLint config choice (flat config or legacy `.eslintrc`)
- turbo.json pipeline tasks (lint, type-check, test, dev, build)
- Node.js engine pinning in `package.json` (`engines: { node: ">=22" }`)
- TypeScript `tsconfig.json` base config (strictest settings recommended)
- Whether to use `@fastify/sensible` for error handling helpers (yes, per STACK.md)
- Dev tooling: `concurrently` or Turborepo `dev` pipeline for local development

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.planning/research/ARCHITECTURE.md` — System design, component boundaries, DB schema (authoritative for table definitions), security layers, data flow patterns
- `.planning/research/STACK.md` — Technology choices, exact versions, BFF pattern, installation reference

### Project Scope
- `.planning/ROADMAP.md` — Phase goals and success criteria
- `.planning/PROJECT.md` — Core constraints, design philosophy
- `.planning/STATE.md` — Decisions and open concerns (monorepo tool now resolved: Turborepo)

</canonical_refs>

<specifics>
## Specific Ideas

### DB Schema Source of Truth
The exact SQL schema is in `.planning/research/ARCHITECTURE.md` under "Database Schema (Core Entities)". The Drizzle schema in `packages/db/src/schema.ts` MUST implement all tables defined there using Drizzle TypeScript syntax (not raw SQL).

### BullMQ Worker Boot
The `apps/api` should boot a BullMQ worker on startup (or as a separate entry point `apps/api/src/worker.ts`). In Phase 1, it just needs to connect to Redis and confirm queue connection — no job processors yet.

### Health Check Endpoint
Fastify must expose `GET /health` returning `{ status: 'ok', db: 'connected', redis: 'connected' }`. This is the Phase 1 success signal for infrastructure.

### Swagger at `/docs`
`@fastify/swagger` + `@fastify/swagger-ui` must be registered and accessible at `http://localhost:3001/docs` in development. This is a Phase 1 success criterion per ROADMAP.md.

</specifics>

<deferred>
## Deferred Ideas

- Deploy configuration (Railway, Fly.io, Render, Docker) — Phase TBD
- Avatar upload and storage (Cloudflare R2 vs S3) — Phase 3
- Auth wiring (better-auth configuration, OAuth callbacks) — Phase 2
- Twitter/X OAuth reliability validation — Phase 2
- PWA/service worker for push — Phase 6
- Anomaly detection rules — Phase 7
- Audit log hook wiring — Phase 7

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-29 via discuss-phase session*

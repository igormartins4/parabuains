# Technology Stack

**Project:** Parabuains — Social Birthday Reminder Platform
**Researched:** 2026-04-29
**Confidence:** HIGH (all versions npm-verified, all libraries Context7-confirmed current)

---

## Decision: Fastify (standalone) over NestJS

**Verdict: Use Fastify v5 as the standalone backend API. Do NOT use NestJS.**

**Rationale:**

1. **Developer profile**: The developer is a frontend engineer with React/Next.js experience. NestJS's Angular-inspired decorator-heavy DI system has a steep learning curve. Fastify's plugin/hook model maps much closer to how React's composition model works.

2. **Architecture requirement is self-imposed**: Clean Architecture + Repository Pattern does NOT require NestJS. These are code organization choices you implement manually. Fastify doesn't prevent this — it just doesn't enforce it either way.

3. **Performance**: Fastify v5 benchmarks at ~76k req/s vs NestJS (Express adapter) ~15-20k req/s. Even NestJS on Fastify adapter adds overhead due to abstraction layers. For a notification-heavy platform that will send scheduled emails + push notifications, this matters.

4. **NestJS + Fastify adapter is the worst of both worlds**: If performance was the goal, NestJS forces you to use the Fastify adapter, which adds the NestJS abstraction overhead on top of Fastify anyway. Either go full NestJS (with Express, accepting the overhead + getting the DI framework) or go pure Fastify.

5. **Security plugins are first-party in Fastify**: `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors`, `@fastify/jwt` — all maintained by the Fastify core team, not community. NestJS security middleware is Express-based (Helmet, express-rate-limit) which you configure separately anyway.

6. **Plugin architecture maps to Clean Architecture**: Fastify's encapsulated plugin system with `fastify-plugin` is an excellent foundation for Clean Architecture's layer separation. Each domain module becomes a Fastify plugin with its own routes, schemas, and hooks.

**Choose NestJS only if:** The team is already NestJS-experienced, or you're building something complex enough to need NestJS's opinionated scaffolding CLI and built-in DI container benefits. Neither applies here.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Next.js** | 16.2.4 | Frontend + BFF (API routes as thin proxy) | Already decided; App Router, RSC, excellent TypeScript DX |
| **Fastify** | 5.8.5 | Backend API | Fastest Node.js framework, first-party security plugins, plugin architecture perfect for Clean Architecture |
| **TypeScript** | 6.0.3 | Language for both frontend and backend | Type safety across the full stack; non-negotiable with clean architecture patterns |
| **Node.js** | ≥22 LTS | Runtime for backend | Fastify v5 requires Node 20+; use 22 LTS for long-term support |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **PostgreSQL** | 16+ | Primary database | Already decided; excellent for relational data (friendships, birthday scheduling, audit logs) |
| **Drizzle ORM** | 0.45.2 | ORM + migrations | TypeScript-first, generates type-safe queries at the schema level, not via reflection. Excellent PostgreSQL support. Drizzle Kit handles migrations. Much lighter than Prisma, much better TypeScript DX than TypeORM |
| **drizzle-kit** | 0.31.10 | Migration CLI | Official Drizzle migration tool; `drizzle-kit push` for dev, `drizzle-kit generate` + `migrate` for prod |
| **pg** | 8.20.0 | PostgreSQL driver | Node.js native driver; Drizzle uses it under the hood for `node-postgres` dialect |

### Cache & Queue

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Redis** (via ioredis) | 5.10.1 | Rate limit store + session cache + job queue store | Required by `@fastify/rate-limit` for distributed rate limiting; required by BullMQ for job queues |
| **BullMQ** | 5.76.4 | Background job queue for scheduled reminders | Industry standard for Node.js scheduled jobs. Handles birthday reminder scheduling (cron-like delayed jobs), email queuing, push notification delivery with retries and failure tracking |

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **better-auth** | 1.6.9 | Auth library (sessions, OAuth, 2FA, email/password) | Framework-agnostic TypeScript-first auth library. Has first-class Drizzle ORM adapter, built-in Google + Twitter/X OAuth, 2FA TOTP plugin, email verification. Works with both Next.js (BFF) and Fastify. Replaces Auth.js (NextAuth) which is Next.js-only and Passport.js which is Express-focused |

**better-auth configuration highlights:**
- `socialProviders: { google: {}, twitter: {} }` — native OAuth support
- `twoFactor()` plugin — TOTP-based 2FA with backup codes, Drizzle schema auto-generated
- `username()` plugin — for custom user slugs (`/parabuains/usuario`)
- Works with `drizzle` adapter out of the box with schema auto-migration

### Email

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Resend** | 6.12.2 | Transactional email delivery | Developer-DX-first email API. Excellent deliverability, generous free tier (3,000 emails/month), native TypeScript SDK. Preferred over SendGrid (too enterprise-heavy) or Nodemailer (SMTP DIY) |
| **React Email** (`@react-email/components`) | 1.0.12 | Email template rendering | Build birthday reminder emails as React components. Renders to HTML. Integrates directly with Resend. Avoid raw HTML email templates — they're unmaintainable |

### Push Notifications

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **web-push** | 3.6.7 | Web Push API (VAPID) | The canonical Node.js library for Web Push Protocol. Handles VAPID key auth, payload encryption, browser compatibility (Chrome, Firefox, Edge, Safari 16+). No external service dependency — self-hosted push |

### Security Middleware (Fastify)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@fastify/helmet** | 13.0.2 | Security HTTP headers | Sets CSP, HSTS, X-Frame-Options, etc. First-party Fastify plugin. Must be registered globally before routes |
| **@fastify/rate-limit** | 10.3.0 | Rate limiting | Per-route configuration (e.g., 5 req/min for `/auth/login`, 100 req/min for `/api/*`). Redis store for distributed rate limiting |
| **@fastify/cors** | 11.2.0 | CORS | Restrict to Next.js frontend origin only. First-party Fastify plugin |
| **@fastify/jwt** | 10.0.0 | JWT signing/verification | For API token auth between Next.js BFF and Fastify API. HMAC-SHA256 minimum; use RS256 in production |
| **Zod** | 4.3.6 | Input validation & schema | Validate ALL incoming request bodies and query params. Use `fastify-type-provider-zod` to connect Zod schemas to Fastify's schema validation pipeline. Zod v4 is the current major version |

### Frontend (Next.js)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Next.js** | 16.2.4 | Frontend framework | App Router (RSC + Server Actions), file-system routing, API routes for BFF proxy layer |
| **Tailwind CSS** | 4.2.4 | Styling | Already decided; v4 uses CSS-native config (no `tailwind.config.js`), PostCSS-based |
| **TanStack Query** (`@tanstack/react-query`) | 5.100.6 | Client-side data fetching | Server state management for client components. Handles caching, background refetch, optimistic updates (e.g., friend requests). Do NOT use SWR — TanStack Query has richer features for a social platform |
| **Zustand** | — | Client-side UI state | Lightweight global state for UI (notifications panel open, theme, etc.). Not for server data — that's TanStack Query |

### Logging & Observability

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Pino** | 10.3.1 | Structured logging | Fastify uses Pino natively. Fast JSON logging. Structured logs required for audit trail |
| **pino-pretty** | 13.1.3 | Dev log formatter | Human-readable logs in development. Never use in production |

### API Documentation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@fastify/swagger** | 9.7.0 | OpenAPI spec generation | Auto-generates OpenAPI 3.0 spec from Fastify route schemas |
| **@fastify/swagger-ui** | 5.2.6 | Swagger UI | Dev-only API explorer. Disable in production |

### Development & Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vitest** | — | Unit + integration testing | Fastest test runner for TypeScript. Vite-based, works perfectly with Zod schemas and Fastify plugins |
| **fastify-plugin** | 5.1.0 | Plugin encapsulation utility | Required pattern for Fastify Clean Architecture — `fp()` wrapper prevents scope leaking between plugins |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend framework | **Fastify 5** | NestJS | NestJS adds opinionated overhead the developer doesn't need. Fastify is faster and Clean Architecture is implemented in code, not by the framework |
| Backend framework | **Fastify 5** | Hono | Hono is excellent for edge/serverless. Fastify has better ecosystem for long-running Node.js processes with plugins, rate limiting, etc. |
| ORM | **Drizzle** | Prisma | Prisma has slow TypeScript inference, heavy runtime, and magic abstraction. Drizzle is raw SQL with types — perfect for repository pattern |
| ORM | **Drizzle** | TypeORM | TypeORM's decorator approach is messy and TypeScript types are weaker. Drizzle wins on DX |
| Auth | **better-auth** | Auth.js (NextAuth) | Auth.js is tied to Next.js. We need auth to work on the Fastify backend too. better-auth is truly framework-agnostic |
| Auth | **better-auth** | Passport.js | Passport is Express-first, no native Fastify support, no Drizzle adapter, requires many packages to achieve what better-auth provides out of the box |
| Email | **Resend** | SendGrid | SendGrid is enterprise-heavy with complex setup. Resend is developer-first with clean TypeScript SDK |
| Email | **Resend** | Nodemailer | Nodemailer requires your own SMTP/SES setup and handling deliverability yourself. Not worth it for v1 |
| Job queue | **BullMQ** | node-cron | node-cron doesn't persist jobs, doesn't retry failures, no distributed support. BullMQ is the right tool for "remind user X days before birthday" |
| Job queue | **BullMQ** | Agenda | Agenda uses MongoDB. BullMQ uses Redis (already in stack for rate limiting) |
| Push notifications | **web-push** | Firebase FCM | FCM requires Google dependency and app registration. web-push is W3C Web Push standard — works natively in all modern browsers |
| Frontend state | **TanStack Query** | SWR | SWR is simpler but lacks mutation management, optimistic updates, and retry strategies needed for social features |
| Frontend state | **Zustand** | Redux Toolkit | Redux is overkill for UI state in a focused app. Zustand is 8x smaller and has simpler API |
| CSS | **Tailwind v4** | styled-components / Emotion | CSS-in-JS adds runtime overhead and is not SSR-friendly in RSC. Tailwind is static and compiles to nothing |

---

## Installation Reference

```bash
# Backend API (Fastify)
npm install fastify fastify-plugin @fastify/helmet @fastify/rate-limit @fastify/cors @fastify/jwt @fastify/swagger @fastify/swagger-ui @fastify/sensible
npm install drizzle-orm pg
npm install better-auth
npm install bullmq ioredis
npm install resend @react-email/components
npm install web-push
npm install pino zod

# Backend Dev dependencies
npm install -D drizzle-kit typescript @types/node @types/pg @types/web-push pino-pretty vitest

# Frontend (Next.js)
npm install next react react-dom tailwindcss
npm install @tanstack/react-query zustand
npm install better-auth  # shared auth client

# Frontend Dev
npm install -D typescript @types/react @types/react-dom
```

---

## Architecture Notes

### BFF Pattern (Next.js ↔ Fastify)
- **Next.js App Router** handles: SSR pages, RSC data fetching, API routes that proxy to Fastify
- **Next.js API routes** serve as BFF: thin proxy + auth cookie management
- **Fastify API** is the source of truth for business logic; Next.js never talks to PostgreSQL directly
- better-auth session runs on BOTH: Next.js middleware validates sessions for page protection, Fastify validates the same session token for API auth

### Security Layer (Fastify)
```
Request → @fastify/helmet → @fastify/cors → @fastify/rate-limit → @fastify/jwt → Route Handler → Zod validation → Business logic
```

### Job Queue (BullMQ + Redis)
- **BirthdayReminderQueue**: Cron-like job scheduled for each user's friend birthdays (T-7 days, T-1 day, day-of)
- **EmailQueue**: Wraps Resend API calls with retry logic
- **PushNotificationQueue**: Wraps web-push calls with subscription cleanup on 410/404 errors
- Workers run as separate processes or as Fastify lifecycle hooks

### Drizzle + Repository Pattern
```
Route → Controller (Fastify handler) → Service → Repository → Drizzle db
```
- Repository accepts `db: DrizzleDB` type, never direct SQL strings
- Service orchestrates cross-repository operations
- Controllers only parse/validate input and serialize output

---

## Version Source Notes

All versions npm-verified as of 2026-04-29:
- `fastify@5.8.5` — [npmjs.com/package/fastify](https://www.npmjs.com/package/fastify)
- `next@16.2.4` — [npmjs.com/package/next](https://www.npmjs.com/package/next)
- `drizzle-orm@0.45.2` — [npmjs.com/package/drizzle-orm](https://www.npmjs.com/package/drizzle-orm)
- `better-auth@1.6.9` — [npmjs.com/package/better-auth](https://www.npmjs.com/package/better-auth)
- `zod@4.3.6` — [npmjs.com/package/zod](https://www.npmjs.com/package/zod)
- `bullmq@5.76.4` — [npmjs.com/package/bullmq](https://www.npmjs.com/package/bullmq)
- `resend@6.12.2` — [npmjs.com/package/resend](https://www.npmjs.com/package/resend)
- `web-push@3.6.7` — [npmjs.com/package/web-push](https://www.npmjs.com/package/web-push)
- `tailwindcss@4.2.4` — [npmjs.com/package/tailwindcss](https://www.npmjs.com/package/tailwindcss)
- `@tanstack/react-query@5.100.6` — verified via npm

Library documentation sources:
- Fastify: [fastify.dev/docs/latest](https://fastify.dev/docs/latest/) (v5.8.x confirmed)
- NestJS: Context7 `/nestjs/docs.nestjs.com` (HIGH reputation)
- Drizzle ORM: Context7 `/drizzle-team/drizzle-orm-docs` (HIGH reputation)
- better-auth: Context7 `/better-auth/better-auth` (HIGH reputation, v1.2.9+)
- Resend: Context7 `/websites/resend` (HIGH reputation)
- web-push: Context7 `/web-push-libs/web-push` (HIGH reputation)
- @fastify/rate-limit: Context7 `/fastify/fastify-rate-limit` (HIGH reputation, 93.1 score)

---

## Confidence Levels

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js 16 + App Router | HIGH | npm-verified v16.2.4; Context7 docs confirmed RSC patterns |
| Fastify v5 | HIGH | npm-verified v5.8.5; official docs at fastify.dev; all @fastify/* plugins verified |
| Drizzle ORM | HIGH | npm-verified v0.45.2; Context7 confirmed PostgreSQL + migrations patterns |
| better-auth | HIGH | npm-verified v1.6.9; Context7 confirmed Google/Twitter OAuth + 2FA + Drizzle adapter |
| Zod v4 | HIGH | npm-verified v4.3.6; Context7 confirmed as current stable |
| Resend + React Email | HIGH | npm-verified; Context7 confirmed SDK patterns |
| BullMQ | HIGH | npm-verified v5.76.4; industry standard for Redis-backed queues |
| web-push | HIGH | npm-verified v3.6.7; W3C standard implementation |
| Tailwind v4 | HIGH | npm-verified v4.2.4; CSS-native config (breaking from v3) — be aware |
| Fastify vs NestJS decision | HIGH | Based on verified docs, developer profile, and architecture requirements |

---

## What NOT to Use

| Technology | Reason |
|------------|--------|
| **Prisma** | Heavy runtime, slow TypeScript inference with large schemas, magic abstraction layer hides SQL complexity that a social platform needs to control |
| **Express.js** | Outdated for new projects; Fastify is objectively better with TypeScript, performance, and ecosystem |
| **Auth.js (NextAuth v5)** | Tightly coupled to Next.js; does not work cleanly with a separate Fastify API backend |
| **Firebase (any)** | Vendor lock-in; Firebase Firestore is not PostgreSQL; Firebase FCM adds Google dependency for push; overkill for this use case |
| **GraphQL** | Over-engineered for this use case; REST is sufficient; GraphQL's complexity (N+1, schema stitching, subscriptions) has no ROI for a birthday reminder app |
| **Microservices** | Premature for v1; start with a monolithic Fastify API and extract if needed; the Repository Pattern makes extraction easy when the time comes |
| **WebSockets (for real-time)** | Not needed for v1; birthday reminders are asynchronous; Web Push + Email covers the notification use case without the complexity of persistent connections |
| **node-cron / setTimeout** | Do not use for scheduling birthday reminders; they don't persist across restarts; BullMQ's delayed/repeatable jobs are the correct solution |

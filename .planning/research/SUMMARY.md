# Project Research Summary

**Project:** Parabuains — Social Birthday Reminder Platform
**Domain:** Social web app with scheduled notifications, bilateral social graph, and public profile pages
**Researched:** 2026-04-29
**Confidence:** HIGH

---

## Executive Summary

Parabuains is a focused social platform in the "social celebration" space — closer to Kudoboard/GroupGreeting than to Facebook. The core product loop is simple: user creates a profile with their birthday → shares their public page → friends add each other → platform sends reminders so no one forgets. The research confirms this is a well-understood domain with clear table stakes, and all required technologies are mature, well-documented, and available as npm packages with verified current versions.

The recommended architecture is a **BFF + Clean Architecture monolith**: Next.js (App Router) as frontend and thin proxy layer, Fastify v5 as the backend API with full Clean Architecture layering (Routes → Services → Repositories → Drizzle ORM → PostgreSQL), and BullMQ + Redis for all scheduled notification work. The key non-obvious decision is **Fastify over NestJS** — the developer is React-experienced, NestJS's decorator/DI overhead provides no return for this project size, and Fastify's plugin model maps naturally to Clean Architecture without framework enforcement. **Drizzle over Prisma** for the same reason: lighter, TypeScript-native, no runtime magic, perfect for Repository Pattern. **better-auth over NextAuth** because the BFF pattern requires auth that works identically on both the Next.js layer and the Fastify API layer.

The two categories of risk are **security** (OAuth account takeover, social graph privacy leaks, rate limiting gaps) and **notification correctness** (timezone bugs destroying the core value proposition, push permission UX permanently blocking users, stale subscriptions silently failing). Both risk categories must be addressed architecturally from day 1 — they are expensive to retrofit. The good news: the research identified the exact prevention patterns for all critical pitfalls, and the architecture is explicitly designed to handle them.

---

## Key Findings

### Recommended Stack

The stack is fully TypeScript across frontend and backend with no gaps or impedance mismatch. See [STACK.md](./STACK.md) for all versions and rationale.

**Core technologies:**

| Technology | Version | Purpose | Decision |
|-----------|---------|---------|----------|
| **Next.js** | 16.2.4 | Frontend + BFF proxy layer | App Router, RSC, Server Actions |
| **Fastify** | 5.8.5 | Backend API (core domain) | Faster than NestJS, first-party plugins, plugin = Clean Architecture layer |
| **TypeScript** | 6.0.3 | Full-stack language | Non-negotiable with Clean Architecture |
| **PostgreSQL** | 16+ | Primary database | Relational; ideal for social graph + audit logs |
| **Drizzle ORM** | 0.45.2 | ORM + migrations | TypeScript-first, no runtime overhead, ideal for Repository Pattern |
| **better-auth** | 1.6.9 | Auth (sessions + OAuth + 2FA) | Framework-agnostic; works on both Next.js AND Fastify; Drizzle adapter built-in |
| **Redis + ioredis** | 5.10.1 | Rate limit store + job queue backend | Dual-purpose: BullMQ jobs + `@fastify/rate-limit` store |
| **BullMQ** | 5.76.4 | Scheduled birthday reminders | Persisted jobs, retries, cron-like delays — the only correct tool for this |
| **Resend** | 6.12.2 | Transactional email | Developer-DX-first, generous free tier, clean TypeScript SDK |
| **React Email** | 1.0.12 | Email templates as React components | Maintainable HTML emails via JSX |
| **web-push** | 3.6.7 | Web Push API (VAPID) | W3C standard, no external service dependency, Safari 16+ compatible |
| **Zod** | 4.3.6 | Input validation + schema | All incoming request bodies validated; connects to Fastify via `fastify-type-provider-zod` |
| **TanStack Query** | 5.100.6 | Client-side server state | Caching, optimistic updates, retries for social features |
| **Tailwind CSS** | 4.2.4 | Styling | CSS-native config (v4 breaking change — no `tailwind.config.js`) |

**What NOT to use:** Prisma (heavy runtime), NestJS (unnecessary overhead), Auth.js/NextAuth (Next.js-only), Firebase (vendor lock-in), GraphQL (over-engineered for this domain), WebSockets (async notifications don't need persistent connections), node-cron (no persistence across restarts).

---

### Expected Features

Full details in [FEATURES.md](./FEATURES.md). The v1 critical path is: **Auth → Profile → Public page → Privacy controls → Friendship → Feed → Message wall → Notifications**.

**Must have (table stakes) — absence causes abandonment:**
- Account creation with email/password + Google OAuth (Twitter/X optional but listed in project brief)
- Birthday profile: name, photo, birth month/day (year hidden by default), optional bio
- Public profile page at `/username` with OG meta tags for social sharing previews
- Bilateral friendship (request, accept, reject, remove) — not asymmetric follow
- Upcoming birthday feed ("birthdays this week / next 30 days")
- Countdown on profile page
- Message wall (public congrats) with basic report/hide moderation
- Privacy controls (public / friends-only / private) — without this users won't enter real birthday
- Email notifications (configurable: 7d, 3d, 1d before)
- Web push notifications (with proper opt-in UX — see Pitfall C2)
- Password reset / account recovery
- Mobile-first responsive design

**Should have (differentiators worth considering for v1 or early v2):**
- Private/anonymous messages to birthday person (opt-in by profile owner)
- Belated birthday window (allow messages 3 days after birthday) — low effort, high empathy
- Year hidden by default / month+day display — cultural expectation, especially in Brazil
- One-click "send wishes" button — pre-filled "Happy birthday!" with optional edit
- Notification digest ("This week's birthdays") — weekly email, low noise, high retention
- Notification preview personalization: "João turns 30 on Friday" (with user's permission for year)

**Defer to v2+ (not needed for launch):**
- Wish list / gift hints
- Shareable countdown badge/widget
- "Who shares my birthday" discovery
- Profile themes (premium)
- Calendar / external integrations
- Group/corporate plans
- WhatsApp integration
- Native mobile app
- Ads (never before PMF)

**Anti-features (never build these):**
- Full social timeline/feed beyond birthdays
- Reactions/likes on messages (hollow engagement mechanics)
- AI-generated birthday messages (devalues authenticity)
- In-app gift purchasing / e-commerce
- Calendar import for non-friend birthdays (privacy violation)
- Public ranking/leaderboards (social anxiety, alienates introverts)

---

### Monetization Roadmap

Validated by competitor research (Kudoboard, GroupGreeting, Gifted.co). **Monetization deferred to v2** as per PROJECT.md constraints.

**Recommended v2 order:**
1. **Premium profile** — cosmetic differentiation (themes, badges, priority feed placement); freemium, ~5-10% conversion at $3-5/mo
2. **Gift affiliate links** — contextual placement near birthdays; zero ops cost, passive revenue
3. **Corporate/team plans** — HR managers tracking team birthdays; higher ARPU, B2B validation
4. **Featured virtual gifts / animated cards** — per-transaction; GroupGreeting validated $4.99/card

**Anti-monetization (kills the product):**
- Paywalling notifications — notifications ARE the core value; never gate them
- Selling birthday data — catastrophic trust violation
- Ads before product-market fit

---

### Architecture Overview

Full details in [ARCHITECTURE.md](./ARCHITECTURE.md). The architecture is a 4-component system with strict boundaries.

**System topology:**

```
Browser → Next.js (RSC + Client Components)
             ↓ HTTPS / Server Actions
         Next.js BFF Layer (API Routes + Auth middleware)
             ↓ Internal HTTP + short-lived JWT (60s)
         Fastify API (Clean Architecture: Routes → Services → Repositories)
             ↓                              ↓
         PostgreSQL                      Redis
                                           ↓
                               BullMQ Notification Worker
                                    ↓              ↓
                                Resend          web-push
```

**5-layer security stack (defense in depth):**
1. **Edge/CDN** — DDoS, TLS termination, geo-blocking
2. **Next.js Middleware** — CSP/HSTS headers, rate limiting (IP-based, Redis), bot detection
3. **better-auth** — OAuth PKCE, bcrypt credentials, TOTP 2FA, httpOnly + SameSite=Strict cookies
4. **Next.js BFF** — Session validation + request signing → Fastify
5. **Fastify API** — JWT verification, Zod validation, per-route rate limiting, Helmet headers, audit logging

**Notification fan-out flow:**
```
Daily Cron (BullMQ, 08:00 UTC)
  → Query PostgreSQL: birthdays in next 7 days + their friends
  → For each (recipient, birthday_person):
      → Check notification_preferences (opt-in)
      → Check notification_log (idempotency: one per year per (recipient, subject, channel, type))
      → Enqueue job to birthday-notifications queue
          → Worker: Email via Resend OR Push via web-push
              → On 410/404 from push service: delete stale subscription
              → Log delivery to notification_log
```

**Key design patterns:**
- **Repository Pattern**: `IUserRepository` interface (domain) → `DrizzleUserRepository` (infrastructure); enables unit testing with mock repos; decouples domain from ORM
- **Service Layer**: Business logic lives exclusively in services, never in routes or repositories
- **Factory Pattern**: `NotificationTransportFactory` — email or push; new transports (SMS, Slack) add without touching worker core
- **Observer/Events**: Domain events (`FriendshipAccepted`, `BirthdayToday`) decouple side effects from primary operations
- **DAL Pattern (Next.js)**: `lib/dal.ts` with `import 'server-only'` — re-verifies session on every RSC call; prevents auth holes

**Core database entities:** `users`, `oauth_accounts`, `friendships`, `wall_messages`, `notification_preferences`, `push_subscriptions`, `notification_log`, `audit_logs`

**Critical schema decisions:**
- `birth_date DATE` (no time) + separate `IANA timezone` field on users
- `birth_year_hidden BOOLEAN DEFAULT FALSE`
- UUID primary keys everywhere (no sequential IDs on user-facing endpoints)
- `notification_log` unique constraint on `(recipient_id, subject_id, channel, reminder_type, year)` — idempotency
- `friendships` stores single row with `requester_id < addressee_id` canonical ordering + UNIQUE constraint

---

### Critical Pitfalls to Avoid

Full details in [PITFALLS.md](./PITFALLS.md). These are the mistakes that cause rewrites or security incidents.

**🔴 Critical (causes feature breakage or security incidents):**

1. **Timezone bugs on birthday notifications** (C1) — Scheduling reminders at UTC times means notifications arrive on the wrong calendar day for users in different timezones. **Prevention:** Store IANA timezone at registration; compute `(birthday_this_year - 1 day) AT user_timezone 09:00 → convert to UTC` for BullMQ job scheduling. Use `date-fns-tz` or `luxon`. Write integration tests with UTC-12, UTC+5:30, and DST boundary users. **Handle Feb 29 birthdays** by treating as Feb 28 in non-leap years.

2. **Push permission prompt on page load** (C2) — Calling `Notification.requestPermission()` without user context → 50-80% of users permanently block. **Prevention:** Double permission pattern — show in-app modal explaining value → user clicks "Yes, enable" → then call browser prompt. Never request on page load or immediately post-signup. Place contextually after first friend is added.

3. **Social graph privacy leaks** (C3) — Returning 403 (not 404) for private profiles confirms user existence; timing attacks reveal friendship status. **Prevention:** Private profiles return 404; all friendship queries scoped to `WHERE user_id = current_user_id`; never expose sequential IDs; birthday year never shown to non-friends.

4. **OAuth account takeover via email collision** (C4) — Auto-linking OAuth account to existing email+password account enables account takeover. **Prevention:** Use separate `oauth_accounts` table `(user_id, provider, provider_id)`; never auto-merge on email alone; require explicit link from settings after original-method login.

5. **Stale push subscriptions silently failing** (C5) — Browser clears data → `PushSubscription` endpoint invalid → server keeps sending → silent failures. **Prevention:** Parse every push send response; on `410 Gone` or `404`: immediately delete subscription from DB; revalidate subscription on service worker activate event.

**🟡 Moderate (degrades UX or creates technical debt):**

- **Rate limiting gaps** (M1) — Apply to ALL state-changing endpoints, not just login. Include `/forgot-password`, `/friendship/request`, wall message posting.
- **XSS in wall messages** (M2) — Never `dangerouslySetInnerHTML` user content; plain text storage + DOMPurify on render + CSP.
- **Friendship race condition** (M3) — Canonical ordering `(user_id_1 < user_id_2)` + UNIQUE constraint + INSERT ON CONFLICT upsert.
- **Email bounce handling** (M4) — Subscribe to Resend bounce/complaint webhooks; hard bounce → stop sending; spam complaint → unsubscribe. Set up SPF, DKIM, DMARC on day 1.
- **Notification fan-out storm** (M7) — BullMQ with concurrency limits + batch email sends + 2-hour stagger window.
- **2FA recovery codes** (M6) — 10 one-time codes at enrollment, stored hashed (bcrypt), invalidated on use.

---

## Implications for Roadmap

Based on combined research, the architecture's dependency graph maps cleanly to 7 phases. The order is dictated by hard dependencies: you can't build social features without profiles; can't build notifications without the social graph; can't harden what isn't built yet.

### Phase 1: Foundation & Infrastructure
**Rationale:** Everything depends on this. Schema, monorepo, database, Redis, BullMQ scaffolding, and environment setup must be complete before writing a single business feature. UUID-based schema design is non-negotiable at this phase — migration later is painful.
**Delivers:** Running Next.js + Fastify apps in a monorepo; PostgreSQL with complete Drizzle schema; Redis + BullMQ wired up; Swagger dev API explorer; CI/CD pipeline
**Critical:** UUID primary keys, IANA timezone field on users, idempotency constraint on notification_log, correct bilateral friendship schema (canonical ordering + UNIQUE)
**Avoids:** M5 (sequential IDs), M3 (friendship race condition) — prevented by schema design at this phase

### Phase 2: Authentication & Security Foundation
**Rationale:** Auth is the gate to everything. The OAuth collision pitfall (C4) and JWT configuration (Mi4) must be correct before any user data is stored. Rate limiting must be in place before the app is reachable.
**Delivers:** Email/password + Google OAuth login; better-auth sessions with httpOnly cookies; BFF ↔ Fastify service JWT flow; 5-layer security stack (Middleware headers, rate limiting, CORS, Helmet, Zod validation); TOTP 2FA foundation; password reset flow
**Uses:** better-auth with Drizzle adapter; `@fastify/rate-limit` with Redis store; `@fastify/helmet`; `@fastify/jwt`; Zod schemas
**Avoids:** C4 (OAuth collision — `oauth_accounts` table), Mi4 (JWT rotation — RS256 + refresh tokens), Mi3 (username blocklist)

### Phase 3: User Profiles
**Rationale:** Profiles are the core data model. Without a profile, nothing else has a subject. Public pages with good OG tags are the growth loop — sharing `/username` URLs is how the product spreads.
**Delivers:** Profile setup/edit API; public `/[username]` pages (RSC, OG meta tags); privacy controls (public/friends/private); avatar upload (S3/R2); year-hidden-by-default display; countdown calculation
**Implements:** Privacy controls with 404-for-private pattern (C3 prevention); `birth_year_hidden` logic; RSC caching for public pages
**Avoids:** C3 (privacy leak — 404 not 403 for private profiles)

### Phase 4: Social Graph (Friendship)
**Rationale:** The notification system (Phase 6) fans out to friends. The birthday feed (Phase 4) depends on the friendship graph. Cannot build either without bilateral friendship first.
**Delivers:** Friendship request/accept/reject/remove API; friend birthday feed ("upcoming in 30 days"); friend list management UI
**Implements:** FriendshipService + FriendshipRepository; bilateral canonical ordering; pagination-safe feed queries; friendship-scoped privacy enforcement
**Avoids:** M3 (race condition — upsert with canonical ordering), C3 (graph enumeration — friendship queries scoped to current user)

### Phase 5: Message Wall
**Rationale:** The emotional payoff of the product — seeing friends write "happy birthday." Depends on profiles (who owns the wall) and friendships (to determine who can post). Isolated enough to develop in parallel with or right after Phase 4.
**Delivers:** Public congrats wall on profile pages; private/anonymous messages (anonymous to recipient only — sender stored for moderation); message moderation (report/hide, soft delete, owner delete)
**Implements:** MessageService + MessageRepository; anonymous message handling (stored sender for abuse prevention); report pipeline; character limit enforcement (500 chars)
**Avoids:** M2 (XSS — no dangerouslySetInnerHTML, DOMPurify + CSP), Mi2 (anonymous message abuse — rate-limit + store sender internally)

### Phase 6: Notifications
**Rationale:** The reminder system is the primary reason users give you their email and enable push. It depends on the social graph (Phase 4) to know WHO to notify and WHEN. This is the highest-risk implementation phase — timezone bugs (C1) and push UX (C2) can destroy the product.
**Delivers:** Notification preferences API (per-user, per-channel, per-timing); BullMQ daily scheduler (08:00 UTC cron, 7-day lookahead, D7/D1/Dday job types); email transport via Resend with React Email templates; web push transport via web-push with VAPID; push opt-in UI (double permission pattern); notification delivery log with idempotency; push subscription management (create, delete stale on 410/404)
**Implements:** Timezone-aware job scheduling (IANA timezone → UTC conversion); fan-out batching with concurrency limits; BullMQ stagger (2h window); email bounce webhook; SPF/DKIM/DMARC DNS setup; Feb 29 leap year handling
**Avoids:** C1 (timezone — IANA + date-fns-tz), C2 (push UX — double permission), C5 (stale subscriptions — 410/404 cleanup), M4 (email bounces — webhook), M7 (fan-out storm — BullMQ batching), Mi1 (Feb 29 — treat as Feb 28), Mi5 (SW update — revalidate on activate)
**⚠ Research Flag:** This phase has the highest concentration of pitfalls. Run timezone integration tests before declaring done.

### Phase 7: Security Hardening & Polish
**Rationale:** Security hardening is ongoing but has a dedicated phase to audit the full system. Rate limiting gaps (M1) and 2FA recovery (M6) are caught here through systematic review. Anomaly detection and audit logs are finalized.
**Delivers:** Fastify `onResponse` audit log hook (full schema: actor, action, resource, IP, metadata, timestamptz); anomaly detection rules (failed login lockout, message volume flags, friendship request rate flags); full 2FA enforcement on sensitive ops (change email, disable 2FA, delete account); input sanitization audit across all endpoints; rate limit tuning per endpoint
**Avoids:** M1 (rate limiting gaps — systematic audit), M6 (2FA recovery — bcrypt hashed single-use codes), M2 (XSS — sanitization audit)

### Phase Ordering Rationale

- **Phases 1→2→3** are a strict linear dependency: infrastructure → auth → profiles. Nothing else can begin.
- **Phases 4→5** can overlap in a team setting but Phase 4 must ship first since Phase 5 needs friendship scoping.
- **Phase 6** must come after Phase 4 (needs the social graph) and cannot start until timezone handling and push UX are designed correctly from the first line of code.
- **Phase 7** is last but security concerns from Phase 7 inform implementation in all earlier phases (UUID IDs in Phase 1, OAuth safety in Phase 2, privacy rules in Phase 3).

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Auth):** better-auth's Drizzle adapter schema generation and the BFF ↔ Fastify service JWT handshake are non-trivial to wire correctly. Phase researcher should dig into the exact session flow.
- **Phase 6 (Notifications):** Timezone arithmetic with `date-fns-tz` + BullMQ delayed jobs + the VAPID web-push pipeline are all areas with subtle implementation details. Phase researcher should verify the exact BullMQ `upsertJobScheduler` API for cron + delayed job combination.

**Phases with standard, well-documented patterns (skip deep research):**
- **Phase 1 (Foundation):** Monorepo setup with Fastify + Next.js is well-documented. Drizzle schema creation is straightforward.
- **Phase 3 (Profiles):** RSC public pages, OG meta tags, and Next.js App Router patterns are highly documented and well-understood.
- **Phase 5 (Messages):** Standard CRUD with soft delete. DOMPurify sanitization is a solved problem.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All npm versions verified 2026-04-29; all libraries confirmed via Context7 with HIGH reputation sources; Fastify vs NestJS decision based on verified benchmarks and developer profile |
| Features | **HIGH** | Triangulated against 5+ competitors (BirthdayAlarm, GroupGreeting, Kudoboard, Gifted.co, MyBirthday.Ninja); feature dependency graph validated against project requirements |
| Architecture | **HIGH** | BFF + Clean Architecture patterns drawn from Next.js official docs, Fastify official docs, and BullMQ docs; all verified via Context7 |
| Pitfalls | **HIGH** | Critical pitfalls sourced from OWASP Cheat Sheet Series + web.dev push notifications documentation; all are domain-specific verified issues, not speculative |

**Overall confidence: HIGH**

### Gaps to Address

- **Monorepo tool choice** (nx vs turborepo) — not resolved in research; either works, but the choice affects workspace setup in Phase 1. Recommend turborepo for simplicity or nx if inter-project task orchestration is needed.
- **Avatar/file upload hosting** — S3 or Cloudflare R2 was mentioned but not researched in depth. For v1 scale, R2 is simpler (no egress fees) but may need validation of Next.js + R2 pre-signed URL patterns.
- **Deployment target** — not specified in PROJECT.md. The Notification Worker is a **separate process** and may need a separate dyno (Railway, Render, Fly.io). This affects Phase 1 CI/CD setup.
- **Twitter/X OAuth** — PROJECT.md lists it as required but Twitter's OAuth API has had reliability issues and policy changes. better-auth supports it natively, but validate API availability before committing to launch requirement.
- **PWA installability** — PROJECT.md says "no native app, web mobile-first." Push notifications require a service worker. Full PWA with installability (manifest, offline shell) is a natural fit but wasn't scoped explicitly — clarify whether PWA install prompt is in scope for v1.

---

## Sources

### Primary (HIGH confidence)
- `fastify.dev/docs/latest` — Fastify v5 plugin architecture, security middleware, route schema validation
- `orm.drizzle.team/docs` — Drizzle ORM PostgreSQL patterns, migrations, relations (Context7 `/drizzle-team/drizzle-orm-docs`)
- `better-auth.com/docs` — OAuth flows, Drizzle adapter, 2FA TOTP plugin (Context7 `/better-auth/better-auth`)
- `nextjs.org/docs/app/guides/authentication` — BFF auth patterns, DAL pattern, Server Action security
- `nextjs.org/docs/app/guides/data-security` — RSC data security, session validation patterns
- `docs.bullmq.io/guide/job-schedulers` — BullMQ `upsertJobScheduler`, repeatable jobs, delayed jobs
- `web.dev/articles/push-notifications-permissions-ux` — Push permission UX (double permission pattern)
- `web.dev/articles/push-notifications-overview` — Stale subscription handling, 410/404 cleanup
- Context7 `/fastify/fastify-rate-limit` — Per-route rate limiting configuration (93.1 score, HIGH)
- Context7 `/websites/resend` — Resend SDK patterns, batch sends, bounce webhooks (HIGH)
- Context7 `/web-push-libs/web-push` — VAPID setup, payload encryption, browser compatibility (HIGH)

### Secondary (MEDIUM confidence)
- BirthdayAlarm.com, GroupGreeting.com, Kudoboard.com, Gifted.co — Competitor feature survey and monetization validation
- OWASP Authentication Cheat Sheet — Auth pitfall prevention patterns
- OWASP IDOR Prevention Cheat Sheet — Privacy enumeration prevention
- OWASP Multifactor Authentication Cheat Sheet — 2FA recovery code handling
- Clean Architecture (Robert C. Martin) — Layered separation principles applied to Node.js context

### Tertiary (LOW confidence / needs validation)
- Twitter/X OAuth reliability — API policy changes may affect v1 scope; validate during Phase 2
- Turborepo vs nx for monorepo — Not researched in depth; standard choice with low risk either way

---

*Research completed: 2026-04-29*
*Ready for roadmap: yes*

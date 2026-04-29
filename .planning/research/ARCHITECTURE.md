# Architecture Patterns

**Project:** Parabuains — Social Birthday Reminder Platform
**Researched:** 2026-04-29
**Confidence:** HIGH

---

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                              │
│            Next.js App (RSC + Client Components)                    │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ HTTPS / REST / Server Actions
┌──────────────────▼──────────────────────────────────────────────────┐
│                     Next.js BFF Layer                                │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Route Handlers│  │Server Actions│  │   Auth (NextAuth.js)   │  │
│  │  /api/[...]    │  │  (mutations) │  │   session management   │  │
│  └────────────────┘  └──────────────┘  └────────────────────────┘  │
│              Rate limiting + CSRF protection here                    │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ Internal HTTP (JWT service tokens)
┌──────────────────▼──────────────────────────────────────────────────┐
│                     Fastify API (Core Domain)                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    HTTP Layer (Routes)                       │   │
│  │   /v1/users  /v1/friendships  /v1/messages  /v1/profiles    │   │
│  └───────────────────────┬─────────────────────────────────────┘   │
│  ┌───────────────────────▼─────────────────────────────────────┐   │
│  │                   Service Layer                              │   │
│  │  UserService  FriendshipService  NotificationService  etc.  │   │
│  └───────────────────────┬─────────────────────────────────────┘   │
│  ┌───────────────────────▼─────────────────────────────────────┐   │
│  │                  Repository Layer                            │   │
│  │  UserRepo  FriendshipRepo  NotificationRepo  MessageRepo     │   │
│  └───────────────────────┬─────────────────────────────────────┘   │
│           Rate limiting + JWT validation + Audit logs here          │
└──────────────────┬────────────────────────────────────────────────-─┘
                   │                     │
       ┌───────────▼──────┐   ┌─────────▼──────────────────────┐
       │   PostgreSQL     │   │  Redis (BullMQ + session cache) │
       │  (primary data)  │   │   Job Queues + Rate limit store │
       └──────────────────┘   └────────────────────────────────┘
                                          │
                          ┌───────────────▼──────────────────┐
                          │   Notification Worker Process    │
                          │  BullMQ Worker (separate dyno)   │
                          │  ┌──────────┐  ┌─────────────┐  │
                          │  │  Email   │  │  Web Push   │  │
                          │  │(SMTP/SES)│  │ (VAPID/FCM) │  │
                          │  └──────────┘  └─────────────┘  │
                          └──────────────────────────────────┘
```

---

## Component Boundaries

### 1. Next.js Frontend + BFF

**Responsibility:** UI rendering, user session management, public-facing API proxy

| Sub-component | Responsibility |
|---|---|
| App Router Pages | RSC-first rendering, public profile pages `/[username]`, auth flows |
| Server Actions | Mutations (post message, send friend request) — bypasses REST for thin ops |
| BFF Route Handlers `/api/*` | Proxy to Fastify API; add session context; handle OAuth callbacks |
| Middleware (`middleware.ts`) | Global rate limiting, bot detection, security headers (CSP, HSTS) |
| Auth module (NextAuth.js) | OAuth (Google, Twitter/X) + credential sessions; stores JWT in httpOnly cookie |
| DAL (Data Access Layer) | Centralized pattern to call Fastify API from RSC — avoids component-level fetching |

**Communicates with:**
- Browser (SSR/RSC output, hydration)
- Fastify API (service-to-service HTTP with short-lived JWT)
- Redis (session store, rate limit counters)

**Does NOT:**
- Connect directly to PostgreSQL
- Process notification jobs
- Store business logic

---

### 2. Fastify API (Core Domain)

**Responsibility:** All business logic, data access, domain rules

| Layer | Libraries | Responsibility |
|---|---|---|
| HTTP Routes | `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` | Request routing, schema validation (JSON Schema + Zod) |
| Service Layer | Pure TypeScript classes | Business logic, domain rules, orchestration |
| Repository Layer | Drizzle ORM + `pg` | Database access — ONLY layer that touches PostgreSQL |
| Auth Guard Hooks | `@fastify/jwt` | Verify service tokens from BFF; validate 2FA claims |
| Audit Hook | Custom `onResponse` hook | Write audit log entries for sensitive ops |

**Communicates with:**
- PostgreSQL (via Drizzle ORM repositories)
- Redis (via BullMQ — enqueue notification jobs)
- Next.js BFF (receives requests)

---

### 3. Notification Worker

**Responsibility:** Asynchronous delivery of email and web push notifications

**Separate process** (separate Node.js worker or separate deployment unit)

| Sub-component | Library | Responsibility |
|---|---|---|
| BullMQ Worker | `bullmq` | Consume jobs from `birthday-notifications` queue |
| Email Transport | `nodemailer` + SES/SMTP | Send HTML email reminders |
| Push Transport | `web-push` | Send Web Push via VAPID |
| Retry/Backoff | BullMQ built-in | Exponential backoff on failed deliveries |
| Daily Scheduler | BullMQ `upsertJobScheduler` | Cron at `0 8 * * *` — scan upcoming birthdays, enqueue per-user jobs |

---

### 4. PostgreSQL (Primary Data Store)

All persistent data. No direct client connections outside Fastify API's repository layer.

---

### 5. Redis

Dual purpose:
- **BullMQ backend** — job queues for notifications
- **Rate limit store** — `@fastify/rate-limit` sliding window counters
- **Session cache** (optional) — NextAuth session storage for faster lookups

---

## Data Flow: Birthday Reminder End-to-End

```
Daily Cron Job (BullMQ Scheduler)
  └─▶ Query PostgreSQL: "SELECT users with birthdays in next 7 days + their friends"
       └─▶ For each (recipient, birthday_person) pair:
            └─▶ Check notification_preferences (opt-in email/push)
                 └─▶ Check notification_log (avoid duplicate sends)
                      └─▶ Enqueue job to `birthday-notifications` queue
                           └─▶ Worker picks up job
                                ├─▶ Email: render template → send via SES
                                └─▶ Push: look up push_subscription → send via web-push
                                     └─▶ Log delivery to notification_log
```

**Key invariant:** The scheduler runs once at 08:00 UTC. It looks 7 days ahead so users get reminders on: D-7, D-1, and D-day. Each job carries `{ recipientId, subjectId, reminderType: 'D7'|'D1'|'Dday' }`.

---

## Design Patterns — Mapped to Components

### Repository Pattern (Fastify API)

```typescript
// Interface (domain layer - no ORM imports)
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByBirthdayRange(from: Date, to: Date): Promise<User[]>;
  save(user: User): Promise<User>;
}

// Implementation (infrastructure layer - uses Drizzle)
class DrizzleUserRepository implements IUserRepository {
  constructor(private db: DrizzleDB) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0] ? toDomain(result[0]) : null;
  }
  // ...
}
```

**Why:** Decouples domain logic from ORM. Enables unit testing services with mock repos. Allows future swap to a different ORM without touching service layer.

---

### Service Layer Pattern (Fastify API)

```typescript
class FriendshipService {
  constructor(
    private friendshipRepo: IFriendshipRepository,
    private userRepo: IUserRepository,
    private eventEmitter: IEventEmitter,
  ) {}

  async sendRequest(requesterId: string, targetUsername: string): Promise<FriendRequest> {
    const target = await this.userRepo.findByUsername(targetUsername);
    if (!target) throw new NotFoundError('User not found');
    if (target.privacyLevel === 'private') throw new ForbiddenError();
    // ... domain rules
    const request = await this.friendshipRepo.createRequest(requesterId, target.id);
    this.eventEmitter.emit('friendship.requested', { requesterId, targetId: target.id });
    return request;
  }
}
```

**Why:** Single responsibility. Business rules live here, not in routes or repositories.

---

### Factory Pattern (Notification Worker)

```typescript
interface INotificationTransport {
  send(payload: NotificationPayload): Promise<void>;
}

class NotificationTransportFactory {
  static create(type: 'email' | 'push'): INotificationTransport {
    switch (type) {
      case 'email': return new EmailTransport();
      case 'push': return new WebPushTransport();
    }
  }
}
```

**Why:** New transport types (SMS, Slack) added without touching worker core logic.

---

### Observer/Event Pattern (Domain Events)

Use a simple in-process event emitter (or a lightweight pub/sub via Redis) to decouple side effects from primary operations:

```
UserRegistered       → send welcome email (via queue)
FriendshipAccepted   → notify both parties (via queue)
BirthdayToday        → send congratulations prompt to friends (via queue)
MessagePosted        → notify profile owner (in-app + optional push)
```

**Why:** Services don't need to know about notifications. Keeps blast radius small when notification logic changes.

---

### DAL Pattern (Next.js BFF)

```typescript
// lib/dal.ts — centralized data access in RSC context
import 'server-only';

export async function getUser(userId: string) {
  const session = await verifySession();
  if (!session) redirect('/login');
  const res = await apiClient.get(`/v1/users/${userId}`, { token: session.serviceToken });
  return res.data;
}
```

**Why:** Per Next.js docs, page-level auth checks don't protect Server Actions — the DAL re-verifies on every call. Prevents authentication holes in RSC.

---

## Security Architecture

### Security Layers (Defense in Depth)

```
Layer 0 — Edge / CDN
  └─▶ DDoS mitigation, TLS termination, geo-blocking

Layer 1 — Next.js Middleware (runs on every request)
  ├─▶ Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  ├─▶ Rate limiting: IP-based (Redis backed), sliding window
  │     Public routes: 60 req/min
  │     Auth routes: 10 req/min
  │     Message posting: 20/hour
  └─▶ Bot / abuse detection (User-Agent heuristics, honeypot fields)

Layer 2 — NextAuth.js (Auth)
  ├─▶ OAuth 2.0 PKCE flow (Google, Twitter/X)
  ├─▶ Credential login: bcrypt hashing (cost factor 12+), rate-limited
  ├─▶ 2FA: TOTP (speakeasy/otpauth), enforced for sensitive ops
  ├─▶ Sessions: httpOnly + Secure + SameSite=Strict cookies
  └─▶ CSRF: double-submit cookie + Server Actions built-in protection

Layer 3 — Next.js BFF Route Handlers
  ├─▶ Session validation on every proxied request
  ├─▶ Input sanitization (strip HTML, max-length enforcement)
  └─▶ Request signing → Fastify API (short-lived service JWT, 60s expiry)

Layer 4 — Fastify API
  ├─▶ JSON Schema validation (Fastify built-in, fast-json-stringify)
  ├─▶ JWT verification (@fastify/jwt) — rejects unsigned/expired requests
  ├─▶ Rate limiting (@fastify/rate-limit) — per-IP + per-userId
  ├─▶ Helmet (@fastify/helmet) — security headers on API responses
  ├─▶ SQL injection prevention — Drizzle ORM parameterized queries
  └─▶ Audit logging hook — onResponse: logs user, action, resource, IP, timestamp

Layer 5 — Database
  ├─▶ Row-level security via application layer (userId checks in queries)
  ├─▶ Minimal DB user privileges (no DROP/ALTER in app user)
  └─▶ Encrypted at rest (cloud provider managed)
```

### 2FA Placement

2FA check lives in the **Fastify API service layer**, not just at login. Sensitive operations (change email, disable 2FA, delete account) require a fresh TOTP verification:

```typescript
// In AccountService
async changeEmail(userId: string, newEmail: string, totpCode: string) {
  const user = await this.userRepo.findById(userId);
  if (!this.totpService.verify(user.totpSecret, totpCode)) {
    throw new InvalidTotpError();
  }
  // proceed
}
```

### Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,  -- 'user.login', 'friendship.create', 'message.post'
  resource    VARCHAR(100),           -- 'user:uuid', 'friendship:uuid'
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

### Anomaly Detection (Simple v1)

- Track failed login attempts per IP/email → lockout after 10 failures in 15 min
- Track message volume per user → flag if >50 messages/hour
- Track friendship request rate → flag if >30 requests/hour
- Alerts to application log (Pino structured JSON) → parse with log aggregator (Datadog/Axiom)

---

## Database Schema (Core Entities)

```sql
-- Users (core identity)
CREATE TABLE users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username        VARCHAR(30) UNIQUE NOT NULL,         -- parabuains.com/username
  email           VARCHAR(255) UNIQUE NOT NULL,
  email_verified  BOOLEAN DEFAULT FALSE,
  password_hash   VARCHAR(255),                        -- NULL for OAuth-only users
  display_name    VARCHAR(100) NOT NULL,
  bio             TEXT,
  avatar_url      TEXT,
  birth_date      DATE NOT NULL,
  birth_year_hidden BOOLEAN DEFAULT FALSE,             -- show age or just MM-DD
  privacy_level   VARCHAR(20) DEFAULT 'public'         -- 'public' | 'friends' | 'private'
                    CHECK (privacy_level IN ('public', 'friends', 'private')),
  totp_secret     VARCHAR(255),                        -- encrypted at app layer
  totp_enabled    BOOLEAN DEFAULT FALSE,
  timezone        VARCHAR(50) DEFAULT 'UTC',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                          -- soft delete
);
CREATE INDEX idx_users_birth_date ON users(birth_date);  -- for birthday lookups
CREATE INDEX idx_users_username ON users(username);

-- OAuth accounts (one user can have multiple)
CREATE TABLE oauth_accounts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    VARCHAR(50) NOT NULL,                    -- 'google' | 'twitter'
  provider_id VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);

-- Friendships (bilateral — both directions stored as single row)
CREATE TABLE friendships (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);
CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);

-- Wall messages (public congratulations on profile)
CREATE TABLE wall_messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- the birthday person
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,          -- NULL = anonymous
  is_anonymous  BOOLEAN DEFAULT FALSE,
  content       TEXT NOT NULL CHECK (char_length(content) <= 500),
  is_private    BOOLEAN DEFAULT FALSE,                                  -- private message
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_wall_messages_profile ON wall_messages(profile_id, created_at DESC);

-- Notification preferences (per user, per channel)
CREATE TABLE notification_preferences (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push')),
  days_before     INT[] DEFAULT '{1,7}',               -- which advance days to send
  enabled         BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, channel)
);

-- Push subscriptions (Web Push VAPID endpoints)
CREATE TABLE push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh_key  TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notification delivery log (idempotency + audit)
CREATE TABLE notification_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- whose birthday
  channel         VARCHAR(20) NOT NULL,
  reminder_type   VARCHAR(10) NOT NULL CHECK (reminder_type IN ('D7', 'D1', 'Dday')),
  status          VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (recipient_id, subject_id, channel, reminder_type,
          date_trunc('year', sent_at))               -- one per year per combo
);
CREATE INDEX idx_notif_log_recipient ON notification_log(recipient_id, sent_at DESC);
```

**Entity Relationship (simplified):**
```
users ──< oauth_accounts
users ──< friendships (as requester OR addressee)
users ──< wall_messages (as profile owner)
users ──< wall_messages (as author)
users ──< notification_preferences
users ──< push_subscriptions
users ──< notification_log (as recipient)
users ──< notification_log (as subject/birthday person)
```

---

## Build Order (Phase Dependencies)

This is the dependency graph — nothing in a later phase can be built before its prerequisites:

```
Phase 1 — Foundation (no deps)
  ├─▶ Monorepo setup (nx or turborepo workspace)
  ├─▶ Next.js app scaffolding
  ├─▶ Fastify API scaffolding
  ├─▶ PostgreSQL schema + Drizzle migrations
  └─▶ Redis + BullMQ setup

Phase 2 — Auth (depends on Phase 1)
  ├─▶ NextAuth.js with Google + Twitter/X OAuth
  ├─▶ Email/password credential login
  ├─▶ BFF ↔ Fastify service token flow
  ├─▶ Security headers + rate limiting (Middleware)
  └─▶ 2FA (TOTP) foundation

Phase 3 — User Profiles (depends on Phase 2)
  ├─▶ Profile setup/edit API
  ├─▶ Public profile pages (/[username])
  ├─▶ Privacy controls
  └─▶ Avatar upload (S3/R2)

Phase 4 — Social Graph (depends on Phase 3)
  ├─▶ Friendship request/accept/reject API
  ├─▶ Friendship Repository + Service
  └─▶ Friend birthday feed

Phase 5 — Messaging (depends on Phase 4)
  ├─▶ Wall messages API (public + anonymous + private)
  └─▶ Message moderation (soft delete, owner delete)

Phase 6 — Notifications (depends on Phase 4)
  ├─▶ Notification preferences API
  ├─▶ BullMQ daily scheduler (birthday scanner)
  ├─▶ Email transport (Nodemailer + SES)
  ├─▶ Web Push transport (web-push + VAPID)
  └─▶ Notification log + idempotency

Phase 7 — Security Hardening (depends on Phase 2, ongoing)
  ├─▶ Audit log hook (Fastify onResponse)
  ├─▶ Anomaly detection rules
  ├─▶ Full 2FA enforcement on sensitive ops
  └─▶ Input sanitization audit
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fat Routes
**What:** Putting business logic in Fastify route handlers
**Why bad:** Untestable, violates SRP, business rules bleed into HTTP layer
**Instead:** Route → Service → Repository — routes only validate input and call services

### Anti-Pattern 2: Direct DB Access from Next.js
**What:** Using Drizzle/pg directly in Server Actions or Route Handlers
**Why bad:** Bypasses API security layer, creates two auth enforcement points, tightly couples frontend to DB schema
**Instead:** Next.js calls Fastify API exclusively — even for internal BFF use

### Anti-Pattern 3: Synchronous Notification Sending
**What:** Sending email/push inline during request handling
**Why bad:** Adds 200-500ms latency to user actions, fails the user request if SMTP is down
**Instead:** Always enqueue to BullMQ; worker handles delivery asynchronously

### Anti-Pattern 4: Storing Raw PII in Job Payloads
**What:** Putting email addresses or names in BullMQ job data
**Why bad:** Redis is transient, job data visible in Bull Board dashboard, complicates GDPR deletion
**Instead:** Store only IDs in job payloads; worker fetches data from DB at execution time

### Anti-Pattern 5: Single Notification Table Without Idempotency
**What:** No deduplication on notification delivery
**Why bad:** Birthday reminders sent multiple times per year on restarts/retries — catastrophic UX
**Instead:** `notification_log` unique constraint on `(recipient, subject, channel, reminder_type, year)`

---

## Scalability Considerations

| Concern | At 1K users | At 50K users | At 500K users |
|---|---|---|---|
| Birthday fan-out | Single query + loop | Paginated batch query | DB partitioning by birth month |
| Notification queue | Single BullMQ worker | Multiple worker replicas | Separate queue per channel |
| Profile page load | RSC cache (60s) | CDN edge cache | Full CDN + ISR |
| Friend feed | N+1 friendly query | Materialized view or denormalized cache | Redis sorted set cache |
| DB connections | Single pool (20 conns) | PgBouncer connection pooler | Read replicas for feeds |

---

## Sources

- Next.js App Router auth patterns: https://nextjs.org/docs/app/guides/authentication (HIGH)
- Next.js data security (DAL pattern): https://nextjs.org/docs/app/guides/data-security (HIGH)
- Fastify plugin architecture: https://fastify.dev/docs/latest/Guides/Plugins-Guide/ (HIGH)
- BullMQ repeatable jobs + schedulers: https://docs.bullmq.io/guide/job-schedulers (HIGH)
- Drizzle ORM schema + relations: https://orm.drizzle.team/docs/rqb (HIGH)
- Clean Architecture (Robert C. Martin): layered separation principle applied to Node.js (MEDIUM)
- Repository Pattern for TypeScript: https://github.com/typestack/typedi (MEDIUM)

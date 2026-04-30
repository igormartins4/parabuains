---
phase: 04-social-graph
plan: "02"
subsystem: feed, notifications, queues
tags: [birthday-feed, sse, bullmq, redis-pubsub, luxon, timezone]
dependency_graph:
  requires: [04-01]
  provides: [feed-api, sse-endpoint, notifications-queue]
  affects: [apps/api/src/modules/feed, apps/api/src/modules/notifications, apps/api/src/queues, apps/api/src/modules/friendships]
tech_stack:
  added: [luxon@3.7.2, @types/luxon@3.7.1]
  patterns: [BullMQ lazy Queue singleton, Redis Pub/Sub per-connection subscriber, SSE keep-alive via raw HTTP, Drizzle raw SQL MAKE_DATE query]
key_files:
  created:
    - apps/api/src/modules/feed/feed.repository.ts
    - apps/api/src/modules/feed/feed.service.ts
    - apps/api/src/modules/feed/feed.routes.ts
    - apps/api/src/modules/feed/feed.plugin.ts
    - apps/api/src/modules/feed/__tests__/feed.service.test.ts
    - apps/api/src/modules/notifications/sse.routes.ts
    - apps/api/src/modules/notifications/sse.plugin.ts
    - apps/api/src/queues/notifications.queue.ts
    - apps/api/src/lib/redis-pub.ts
  modified:
    - apps/api/src/app.ts
    - apps/api/src/modules/friendships/friendship.routes.ts
    - apps/api/package.json
    - apps/web/package.json
decisions:
  - "Used getDb() lazy singleton pattern in FeedRepository (consistent with all other repositories)"
  - "notificationsQueue uses Proxy-based lazy singleton to avoid REDIS_URL crash at test module load time"
  - "redis-pub.ts reuses getRedis() from infrastructure rather than creating a separate Redis connection (simplicity for Phase 4; Phase 6 may separate if needed)"
  - "FeedService.buildBirthdayEntry is public to enable direct unit testing without repo dependency"
  - "SSE routes use request.userId pattern (not fastify.authenticate decorator) consistent with existing routes"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-30"
  tasks_completed: 5
  files_created: 9
  files_modified: 4
  tests_added: 12
  tests_total: 47
requirements: [SOCL-06, SOCL-07]
---

# Phase 4 Plan 02: Birthday Feed + SSE + BullMQ Summary

Birthday feed endpoint with timezone-aware Luxon bucketing, SSE in-app notifications via Redis Pub/Sub, and BullMQ queue stub for Phase 6 notification workers.

## What Was Built

### Feed Module
- **`GET /v1/feed/birthdays`** — returns `{ today: [...], upcoming: [...] }` with friends' birthdays in the next 30 days
- **`FeedRepository.getBirthdayCandidates`** — raw SQL using PostgreSQL `MAKE_DATE()` with 33-day window + year-rollover handling
- **`FeedService.getBirthdayFeed`** — Luxon `DateTime.now().setZone(viewerTimezone)` for accurate timezone-aware bucketing; Feb 29 → Mar 1 fallback

### Notifications Module (SSE)
- **`GET /v1/notifications/stream`** — SSE endpoint with `text/event-stream`, per-connection Redis subscriber
- Heartbeat every 30s (`': heartbeat\n\n'`), 5-minute timeout, full cleanup on socket close/error

### Queues
- **`notifications` BullMQ Queue** — lazy singleton via Proxy, 3 attempts with exponential backoff
- **`FriendshipAcceptedJob`** interface exported for Phase 6 consumer
- **`publishUserEvent(userId, event)`** — publishes to `user:{userId}:events` Redis channel

### Friendship Accept Integration
- `POST /v1/friendships/:id/accept` now enqueues `friendship_accepted` job + publishes SSE event to requester

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] notificationsQueue eager instantiation crashed tests**
- **Found during:** Task 4 + test run
- **Issue:** `new Queue('notifications', { connection: redis })` at module load triggered `getRedis()` which throws if `REDIS_URL` is missing, breaking existing health.test.ts
- **Fix:** Replaced eager instantiation with lazy Proxy singleton (`getNotificationsQueue()`) — same pattern used by `db` and `redis` in infrastructure
- **Files modified:** `apps/api/src/queues/notifications.queue.ts`
- **Commit:** 94106e3

**2. [Rule 1 - Deviation] Routes use `request.userId` not `fastify.authenticate`**
- **Found during:** Task 3 (reading existing codebase patterns)
- **Issue:** Plan specified `onRequest: [fastify.authenticate]` but no such decorator exists in the project; existing routes all use `if (!request.userId)` guard
- **Fix:** Used `request.userId` pattern consistently with friendship.routes.ts and user.routes.ts
- **Files modified:** `feed.routes.ts`, `sse.routes.ts`

**3. [Rule 1 - Deviation] FeedRepository uses getDb() not constructor injection**
- **Found during:** Task 1 (reading existing patterns)
- **Issue:** Plan template showed `constructor(private readonly db: DrizzleDB)` and `fastify.db` injection, but all existing repositories use `getDb()` lazy singleton with no constructor args
- **Fix:** Used `private get db() { return getDb(); }` pattern matching UserRepository and FriendshipRepository
- **Files modified:** `feed.repository.ts`

**4. [Rule 1 - Bug] TypeScript: `rows.rows as BirthdayCandidate[]` type mismatch**
- **Found during:** `tsc --noEmit` after Task 1
- **Issue:** Drizzle `execute()` returns `Record<string, unknown>[]`, not directly castable to typed interface
- **Fix:** Used `as unknown as BirthdayCandidate[]` double-cast
- **Files modified:** `feed.repository.ts`

**5. [Rule 2 - Missing] redis-pub.ts reuses shared Redis client**
- **Found during:** Task 4 implementation
- **Plan** showed creating a separate Redis connection for publisher; existing `infrastructure/redis.ts` already has a ready lazy singleton
- **Decision:** Reuse `getRedis()` for simplicity in Phase 4; separate publisher connection is a Phase 6 concern if high-volume pub/sub is needed

## Test Results

```
Test Files: 4 passed (4)
Tests:      47 passed (47)  [+12 new]
```

New tests in `feed.service.test.ts`:
- today/upcoming/discard bucketing (3 tests)
- Sorting upcoming by daysUntil ASC
- birthYear omission when birthYearHidden=true
- birthYear inclusion when birthYearHidden=false
- Feb 29 fallback to Mar 1
- Year advancement for past birthdays
- Timezone-aware (America/Sao_Paulo)
- pg Date object handling
- birthMonthDay format verification

## TypeScript

`pnpm tsc --noEmit` — ✅ clean (no errors)

## Verification Checklist

- [x] `text/event-stream` in sse.routes.ts
- [x] `': heartbeat\n\n'` heartbeat in sse.routes.ts
- [x] `notificationsQueue.add('friendship_accepted', ...)` in friendship.routes.ts
- [x] `publishUserEvent` called in friendship.routes.ts accept handler
- [x] `MAKE_DATE` in feed.repository.ts
- [x] TypeScript clean
- [x] 47/47 tests passing

## Self-Check: PASSED

Files created/verified:
- ✅ apps/api/src/modules/feed/feed.repository.ts
- ✅ apps/api/src/modules/feed/feed.service.ts
- ✅ apps/api/src/modules/feed/feed.routes.ts
- ✅ apps/api/src/modules/feed/feed.plugin.ts
- ✅ apps/api/src/modules/feed/__tests__/feed.service.test.ts
- ✅ apps/api/src/modules/notifications/sse.routes.ts
- ✅ apps/api/src/modules/notifications/sse.plugin.ts
- ✅ apps/api/src/queues/notifications.queue.ts
- ✅ apps/api/src/lib/redis-pub.ts

Commits verified: 2b26798, 048966a, e023aa9, 94106e3, 7fa099b, 629233d

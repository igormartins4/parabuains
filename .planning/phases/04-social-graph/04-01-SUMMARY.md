---
phase: 04-social-graph
plan: "01"
subsystem: api
tags: [friendship, social-graph, fastify, drizzle, vitest]
dependency_graph:
  requires: []
  provides: [friendship-api, user-search-with-status, friend-suggestions]
  affects: [apps/api/src/app.ts]
tech_stack:
  added: []
  patterns: [Repository pattern, Service layer, Zod v4 validation, lazy getDb() singleton, keyset pagination with base64 cursor]
key_files:
  created:
    - apps/api/src/modules/friendships/friendship.schemas.ts
    - apps/api/src/modules/friendships/friendship.repository.ts
    - apps/api/src/modules/friendships/friendship.service.ts
    - apps/api/src/modules/friendships/friendship.routes.ts
    - apps/api/src/modules/friendships/friendship.plugin.ts
    - apps/api/src/modules/friendships/__tests__/friendship.service.test.ts
  modified:
    - apps/api/src/app.ts
decisions:
  - "Repository uses getDb() lazy singleton (no constructor injection) to match existing UserRepository pattern"
  - "Auth uses request.userId check inline (no fastify.authenticate decorator) matching existing user routes pattern"
  - "Static routes (pending, sent, suggestions) registered before /:id param route to avoid Fastify route shadowing"
  - "searchUsers endpoint placed in friendship.routes.ts (not user.routes.ts) since it returns friendshipStatus per result"
  - "inArray() used for friendship lookup in searchUsers instead of raw SQL string interpolation (Rule 2 - security)"
  - "findManyByIds added to repository to support getSuggestions user data enrichment"
metrics:
  duration: "~25min"
  completed: "2026-04-30"
  tasks_completed: 5
  files_created: 6
  files_modified: 1
---

# Phase 04 Plan 01: Friendship API Summary

**One-liner:** Full friendship CRUD API with bilateral status detection, auto-accept for reciprocal requests, friend-of-friends suggestions, and user search with per-result friendship status.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Zod v4 schemas for friendship endpoints | a07b51e | ✅ |
| 2 | FriendshipRepository (Drizzle ORM) | becf023 | ✅ |
| 3 | FriendshipService with status transitions | 600c61a | ✅ |
| 4 | Fastify routes plugin + app.ts registration | dbf03b5 | ✅ |
| 5 | Vitest unit tests (21 tests) | e49658f | ✅ |

## Endpoints Implemented

| Method | Path | Auth | Status Code |
|--------|------|------|-------------|
| POST | /v1/friendships | required | 201 |
| GET | /v1/friendships | required | 200 |
| GET | /v1/friendships/pending | required | 200 |
| GET | /v1/friendships/sent | required | 200 |
| GET | /v1/friendships/suggestions | required | 200 |
| POST | /v1/friendships/:id/accept | required | 200 |
| DELETE | /v1/friendships/:id | required | 204 |
| GET | /v1/friendships/status/:targetUserId | required | 200 |
| GET | /v1/users/search | required | 200 |

## Test Results

- **35 total tests passing** (21 new + 14 existing)
- **TypeScript:** clean (`tsc --noEmit` — zero errors)

### Test coverage:
- `sendRequest`: self-friend guard, duplicate detection, reciprocal auto-accept, new request creation
- `acceptRequest`: not-found, forbidden (requester can't accept own), already-accepted conflict, happy path
- `removeOrDecline`: not-found, third-party forbidden, both requester and addressee allowed
- `getStatus`: all 4 enum values (`none`, `pending_sent`, `pending_received`, `accepted`) + self-status
- `searchUsers`: empty results, friendship status mapping

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Repository uses getDb() lazy pattern, not constructor-injected DB**
- **Found during:** Task 2
- **Issue:** Plan showed `constructor(private readonly db: DrizzleDB)` but existing pattern in UserRepository uses `private get db() { return getDb(); }` with no constructor arg
- **Fix:** Used `private get db()` getter with `getDb()` to match project convention
- **Files modified:** friendship.repository.ts

**2. [Rule 1 - Bug] No `fastify.authenticate` decorator exists in this project**
- **Found during:** Task 4
- **Issue:** Plan showed `onRequest: [fastify.authenticate]` but auth is handled by global preHandler hook; user routes check `request.userId` inline
- **Fix:** Used `if (!request.userId) { return reply.code(401)... }` pattern matching user.routes.ts
- **Files modified:** friendship.routes.ts

**3. [Rule 2 - Security] Replaced raw SQL string interpolation with inArray()**
- **Found during:** Task 2
- **Issue:** Plan's `searchUsers` used `sql.raw(\`('${userIds.join("','")}')`)` which is SQL injection risk
- **Fix:** Used Drizzle's `inArray(friendships.requesterId, userIds)` for parametrized queries
- **Files modified:** friendship.repository.ts

**4. [Rule 2 - Missing functionality] getSuggestions needed user data enrichment**
- **Found during:** Task 3
- **Issue:** Plan's service stub for `getSuggestions` returned raw `{ id, mutualCount }` without user data (username, displayName, avatarUrl)
- **Fix:** Added `findManyByIds()` to repository and implemented enrichment in service
- **Files modified:** friendship.repository.ts, friendship.service.ts

## Known Stubs

None — all endpoints are fully wired with service/repository.

## Threat Flags

No new security surface beyond what the threat model covers. All endpoints are authenticated. Authorization checks in service layer for accept/remove operations match T-04-01 and T-04-02 mitigations.

## Self-Check: PASSED

Files created:
- ✅ apps/api/src/modules/friendships/friendship.schemas.ts
- ✅ apps/api/src/modules/friendships/friendship.repository.ts
- ✅ apps/api/src/modules/friendships/friendship.service.ts
- ✅ apps/api/src/modules/friendships/friendship.routes.ts
- ✅ apps/api/src/modules/friendships/friendship.plugin.ts
- ✅ apps/api/src/modules/friendships/__tests__/friendship.service.test.ts
- ✅ apps/api/src/app.ts (modified)

Commits verified:
- ✅ a07b51e, becf023, 600c61a, dbf03b5, e49658f

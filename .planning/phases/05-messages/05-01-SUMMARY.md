---
phase: 05-messages
plan: 01
subsystem: api
tags: [wall-messages, fastify, drizzle, bullmq, sanitize-html, xss-protection]
dependency_graph:
  requires: []
  provides: [wall-messages-api, message-moderation, wall-settings-api]
  affects: [notifications-queue]
tech_stack:
  added: [sanitize-html, @types/sanitize-html]
  patterns: [Repository pattern, Service layer, fastify-plugin, lazy singleton queue]
key_files:
  created:
    - apps/api/src/modules/messages/message.types.ts
    - apps/api/src/modules/messages/message.repository.ts
    - apps/api/src/modules/messages/message.service.ts
    - apps/api/src/modules/messages/message.routes.ts
    - apps/api/src/modules/messages/message.plugin.ts
    - apps/api/src/modules/messages/__tests__/message.service.test.ts
  modified:
    - apps/api/src/app.ts
    - apps/api/package.json
decisions:
  - "sanitize-html strips ALL HTML before persistence — service layer responsibility"
  - "Anonymous messages: authorId/author NEVER in formatForResponse() output"
  - "Auto-hide at ≥5 reports sets status back to pending"
  - "BullMQ job name: wall.message_posted"
  - "Honeypot field: website in POST body — silently return 201 if present"
  - "skipAuth: true in route config bypasses auth plugin — check request.userId directly"
  - "getNotificationsQueue() lazy singleton used (not deprecated notificationsQueue Proxy)"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-30"
  tasks_completed: 5
  files_changed: 8
---

# Phase 05 Plan 01: Wall Messages API Summary

Fastify v5 REST API for wall messages: CRUD, moderation, XSS protection, anonymous enforcement, approval flow, BullMQ notifications, 22 unit tests.

## What Was Built

### MessageRepository
`DrizzleMessageRepository` implementing `IMessageRepository`: `findWallMessages`, `findById`, `create`, `softDelete`, `approve`, `reject`, `findPendingByProfileId`, `incrementReportCount`, `isFriend`, `findUserByUsername`, `findUserByUsernameOrId`, `getWallSettings`, `updateWallSettings`.

### MessageService
Business logic: `sanitize-html` XSS protection before persistence, anonymous identity hiding in `formatForResponse()`, approval flow gated by `wallRequireApproval`, auto-hide at ≥5 reports (status → pending), BullMQ `wall.message_posted` job enqueue, honeypot bot detection.

### 8 REST Endpoints
- `GET /v1/users/:username/wall` — public wall (auth optional)
- `POST /v1/users/:username/wall` — post message
- `DELETE /v1/messages/:id` — soft delete (owner or non-anon author)
- `PATCH /v1/messages/:id/approve` — approve pending message
- `PATCH /v1/messages/:id/reject` — reject pending message
- `POST /v1/messages/:id/report` — report with reason
- `GET /v1/users/me/wall/pending` — pending inbox
- `PUT /v1/users/me/wall/settings` — update wall settings

### 22 Unit Tests
Covering: XSS sanitization, anonymous anonymization, approval flow, auto-hide at 5 reports, honeypot bypass, permission checks.

## Deviations from Plan

None — plan executed exactly as written, with minor TypeScript adaptation (`fastify.get` untyped for `skipAuth: true` config compatibility).

## Known Stubs

None.

## Threat Surface

No new surfaces beyond those in plan's threat model.

## Verification Results

- `pnpm tsc --noEmit` in `apps/api`: **0 errors**
- `pnpm vitest run` message tests: **22/22 passed**
- Full test suite: **67/69 passed** (2 pre-existing Redis ECONNREFUSED failures in health tests)

## Self-Check: PASSED

Commit: 023356e — feat(05-messages-01): implement Wall Messages API

---
phase: "06"
plan: "01"
subsystem: notifications/email
tags: [notifications, email, resend, bullmq, preferences]
dependency_graph:
  requires: [packages/db (notification_preferences, notification_log tables), apps/api/queues/notifications.queue.ts]
  provides: [EmailTransport, NotificationService, NotificationPreferencesRepository, NotificationLogRepository, GET/PUT /v1/users/me/notification-preferences, BullMQ worker for wall.message_posted and friendship_accepted]
  affects: [apps/api/src/app.ts, apps/api/src/workers/]
tech_stack:
  added: [resend@6.12.2]
  patterns: [lazy Resend client initialization, lazy singleton BullMQ Worker, repository pattern with getDb(), Zod v4 validation]
key_files:
  created:
    - apps/api/src/modules/notifications/notification-preferences.repository.ts
    - apps/api/src/modules/notifications/notification-log.repository.ts
    - apps/api/src/modules/notifications/email.transport.ts
    - apps/api/src/modules/notifications/notification.service.ts
    - apps/api/src/modules/notifications/notification-preferences.routes.ts
    - apps/api/src/modules/notifications/notification.plugin.ts
    - apps/api/src/workers/notifications.worker.ts
    - apps/api/src/modules/notifications/__tests__/notification.service.test.ts
  modified:
    - apps/api/src/app.ts (registered notificationPlugin at /v1)
    - apps/api/package.json (added resend)
    - .env.example (added RESEND_FROM_EMAIL, updated VAPID vars)
decisions:
  - EmailTransport uses lazy Resend initialization (getter) to avoid missing API key error at module load time / test startup
  - BullMQ Worker created as lazy singleton (startNotificationsWorker()) — never at module top level
  - NotificationService defaults to not sending when no preferences exist (explicit opt-in model)
  - notification_log uses reminderType='Dday' for event-based notifications (wall message, friendship)
metrics:
  duration: "25 minutes"
  completed: "2026-04-30"
  tasks_completed: 8/8
  files_created: 8
  files_modified: 3
  tests_added: 12
  tests_total: 81
---

# Phase 06 Plan 01: Email Notifications Summary

**One-liner:** Resend email transport with lazy initialization, BullMQ consumer for wall/friendship events, and GET/PUT preferences API.

## What Was Built

Email notification infrastructure for Parabuains:

1. **NotificationPreferencesRepository** — `getByUserId` returns all preferences; `upsert` uses `onConflictDoUpdate` on unique (userId, channel) constraint.

2. **NotificationLogRepository** — `create` inserts a log entry; `existsForYear` queries by recipient+subject+channel+reminderType+year for idempotency.

3. **EmailTransport** — Lazy Resend client (initialized on first send, not constructor). Three send methods: `sendBirthdayReminder`, `sendWallMessageNotification`, `sendFriendshipAcceptedNotification`. Subject lines in Portuguese.

4. **NotificationService** — Orchestrates preferences lookup + email/push delivery. `handleWallMessagePosted` and `handleFriendshipAccepted` each: check email pref, send email, log result (sent or failed).

5. **BullMQ Worker** (`notifications.worker.ts`) — Lazy singleton. Processes `wall.message_posted` and `friendship_accepted` jobs. Logs failures, doesn't crash on errors.

6. **API Routes** — `GET /v1/users/me/notification-preferences` (returns all), `PUT /v1/users/me/notification-preferences` (upserts one). Auth check on both. Registered in `notificationPlugin`.

7. **Unit Tests** — 12 tests covering getPreferences (empty/populated), upsertPreference (email/push), handleWallMessagePosted (send/skip/anonymous/log), handleFriendshipAccepted (send/skip/missing-user).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmailTransport lazy initialization to prevent test failure**
- **Found during:** Task 8 (running vitest)
- **Issue:** `new Resend(apiKey)` throws "Missing API key" when `RESEND_API_KEY` is empty. The health test calls `buildApp()` which registers the notification plugin → instantiates EmailTransport → throws.
- **Fix:** Changed `EmailTransport` to use a lazy getter for the Resend client instead of initializing in constructor. Client created only on first `resend.emails.send()` call.
- **Files modified:** `apps/api/src/modules/notifications/email.transport.ts`
- **Commit:** cce0e2d

## Self-Check: PASSED

- [x] `notification-preferences.repository.ts` exists
- [x] `notification-log.repository.ts` exists
- [x] `email.transport.ts` exists
- [x] `notification.service.ts` exists
- [x] `notification-preferences.routes.ts` exists
- [x] `notification.plugin.ts` exists
- [x] `workers/notifications.worker.ts` exists
- [x] `__tests__/notification.service.test.ts` exists
- [x] Commit cce0e2d exists
- [x] 81 tests pass (pnpm vitest run)
- [x] tsc --noEmit clean

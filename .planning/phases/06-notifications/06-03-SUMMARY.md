---
phase: "06"
plan: "03"
subsystem: notifications/scheduler
tags: [notifications, bullmq, cron, scheduler, luxon, timezone, settings-ui]
dependency_graph:
  requires: [06-01 (NotificationService, logRepo), 06-02 (VapidTransport, pushSubRepo), packages/db (users, friendships, notification_log tables)]
  provides: [BirthdaySchedulerRepository, daily cron worker, birthday reminder consumer, /settings/notifications page, GET/PUT /api/notifications/preferences BFF]
  affects: [apps/api/src/workers/notifications.worker.ts, apps/api/src/server.ts]
tech_stack:
  added: []
  patterns: [BullMQ repeatable job (cron pattern), Luxon timezone-aware datetime calculation, dynamic import in worker for lazy repository, settings layout with sidebar navigation]
key_files:
  created:
    - apps/api/src/modules/notifications/birthday-scheduler.repository.ts
    - apps/api/src/workers/birthday-scheduler.worker.ts
    - apps/web/app/settings/notifications/page.tsx
    - apps/web/app/api/notifications/preferences/route.ts
    - apps/web/components/notifications/NotificationsSettingsForm.tsx
    - apps/web/app/settings/layout.tsx
  modified:
    - apps/api/src/workers/notifications.worker.ts (birthday.reminder case + BirthdayReminderJob import)
    - apps/api/src/server.ts (startNotificationsWorker + startBirthdaySchedulerWorker on startup)
decisions:
  - BirthdaySchedulerRepository uses 8-day conservative window (covers all UTC offsets for 7-day reminders)
  - Idempotency checked per channel separately (email + push) so partial sends can be completed
  - BullMQ repeatable job uses jobId='birthday-daily-scan' for deduplication across server restarts
  - Settings layout.tsx created for all settings pages to share sidebar navigation
  - BirthdaySchedulerWorker uses separate Worker instance from NotificationsWorker (different concurrency: 1 vs 5)
metrics:
  duration: "30 minutes"
  completed: "2026-04-30"
  tasks_completed: 9/9
  files_created: 6
  files_modified: 2
  tests_added: 0
  tests_total: 81
---

# Phase 06 Plan 03: Birthday Scheduler Summary

**One-liner:** Daily midnight UTC cron with Luxon timezone-aware daysUntil, per-channel idempotency, and notifications settings UI with push toggle.

## What Was Built

1. **BirthdaySchedulerRepository** — SQL query joins `friendships` + `users` to get all (recipient, birthdayPerson) pairs where birthday falls within `daysAhead` days (UTC). Conservative 8-day window covers all timezones for 7-day reminders. Handles year-boundary wrap-around.

2. **BirthdaySchedulerWorker** — Lazy singleton. On startup, registers BullMQ repeatable job `birthday.scan` with cron pattern `0 0 * * *` (midnight UTC). Processes scan jobs: queries birthday pairs, calculates `daysUntil` in **recipient's** timezone via Luxon, maps to reminderType (D7/D3/D1/Dday), checks idempotency via `logRepo.existsForYear`, enqueues `birthday.reminder` jobs.

3. **Birthday reminder consumer** — Added to `notifications.worker.ts`. Processes `birthday.reminder` jobs. For each: checks email pref + per-channel idempotency → sends email; checks push pref + per-channel idempotency → sends push to all subscriptions with invalid-endpoint cleanup.

4. **Server startup** — `server.ts` now calls `startNotificationsWorker()` and `startBirthdaySchedulerWorker()` on start. Both are lazy — only connect to Redis when first job arrives.

5. **Settings UI** — `/settings/notifications` RSC page loads preferences from API. `NotificationsSettingsForm` (client) has email enabled toggle, daysBefore checkboxes (7/3/1/0), push status badge + "Ativar" button that opens `PushPermissionModal`. Settings layout (`layout.tsx`) adds sidebar navigation to all settings pages.

6. **BFF routes** — `GET/PUT /api/notifications/preferences` proxy to Fastify.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `birthday-scheduler.repository.ts` exists
- [x] `birthday-scheduler.worker.ts` exists
- [x] `apps/web/app/settings/notifications/page.tsx` exists
- [x] `apps/web/app/api/notifications/preferences/route.ts` exists
- [x] `apps/web/components/notifications/NotificationsSettingsForm.tsx` exists
- [x] `apps/web/app/settings/layout.tsx` exists
- [x] Commit acb1782 exists
- [x] 81 tests pass
- [x] tsc --noEmit clean in both apps

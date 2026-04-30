---
phase: "06"
plan: "02"
subsystem: notifications/push
tags: [notifications, web-push, vapid, service-worker, react-hook, ux]
dependency_graph:
  requires: [packages/db (push_subscriptions table), 06-01 (NotificationService, notification-preferences.repository)]
  provides: [VapidTransport, PushSubscriptionRepository, POST/DELETE /v1/push-subscriptions, /sw.js service worker, usePushNotifications hook, PushPermissionModal, BFF /api/push/subscribe]
  affects: [apps/api/src/modules/notifications/notification.service.ts, apps/api/src/modules/notifications/notification.plugin.ts, apps/api/src/workers/notifications.worker.ts]
tech_stack:
  added: [web-push@3.6.7, @types/web-push]
  patterns: [VAPID Web Push, double-confirmation UX (app modal → browser dialog), service worker push event listener, lazy VapidTransport (only created when VAPID env vars present)]
key_files:
  created:
    - apps/api/src/modules/notifications/push-subscription.repository.ts
    - apps/api/src/modules/notifications/vapid.transport.ts
    - apps/api/src/modules/notifications/push-subscription.routes.ts
    - apps/web/public/sw.js
    - apps/web/app/api/push/subscribe/route.ts
    - apps/web/hooks/use-push-notifications.ts
    - apps/web/components/notifications/PushPermissionModal.tsx
  modified:
    - apps/api/src/modules/notifications/notification.service.ts (push delivery, savePushSubscription, deletePushSubscription)
    - apps/api/src/modules/notifications/notification.plugin.ts (registered pushSubscriptionRoutes)
    - apps/api/src/workers/notifications.worker.ts (VapidTransport integration)
    - apps/api/package.json (added web-push)
    - .env.example (added VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY)
decisions:
  - VapidTransport gracefully handles HTTP 404/410 from push endpoints (expired subscriptions auto-deleted)
  - VapidTransport only instantiated when both VAPID env vars are set — graceful degradation if VAPID not configured
  - PushSubscriptionRepository.save uses onConflictDoNothing (idempotent — same endpoint = same subscription)
  - Double-confirmation UX: app modal shown first; browser permission dialog only triggered by user action
  - usePushNotifications hook uses `unknown as ArrayBuffer` cast for Uint8Array type compatibility with TypeScript strict mode
metrics:
  duration: "30 minutes"
  completed: "2026-04-30"
  tasks_completed: 10/10
  files_created: 7
  files_modified: 5
  tests_added: 0
  tests_total: 81
---

# Phase 06 Plan 02: Web Push Notifications Summary

**One-liner:** VAPID web push with invalid-endpoint cleanup, service worker, React hook, and double-confirmation modal before browser permission.

## What Was Built

1. **VapidTransport** — wraps `web-push` library. `sendPushNotification` returns `'sent'` or `'invalid_endpoint'` (HTTP 404/410 → caller deletes stale subscription). Throws on other errors.

2. **PushSubscriptionRepository** — `save` (idempotent via `onConflictDoNothing`, fetches existing if conflict), `deleteByEndpoint`, `findByUserId`.

3. **NotificationService extension** — constructor now accepts optional `VapidTransport | null` and `IPushSubscriptionRepository | null`. Both `handleWallMessagePosted` and `handleFriendshipAccepted` send push to all user subscriptions if push pref is enabled, auto-delete invalid endpoints. New `savePushSubscription` and `deletePushSubscription` methods.

4. **Push API Routes** — `POST /v1/push-subscriptions` (save sub, with Zod validation), `DELETE /v1/push-subscriptions/:endpoint` (URL-decode endpoint, delete). Both require auth.

5. **Service Worker** (`/sw.js`) — `push` event handler shows notification with title/body/url; `notificationclick` focuses existing tab or opens new window.

6. **BFF Route** — `POST /api/push/subscribe` → Fastify POST; `DELETE /api/push/subscribe` (reads endpoint from body) → Fastify DELETE.

7. **usePushNotifications** — isSupported, permission, isSubscribed state. `subscribe()`: registers SW, calls `pushManager.subscribe()` with VAPID key, POSTs to BFF. `unsubscribe()`: DELETEs from BFF, calls `subscription.unsubscribe()`.

8. **PushPermissionModal** — Four states: not-supported, denied, success/already-subscribed, default offer. Only triggers browser dialog on explicit "Ativar" click.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Uint8Array type compatibility with TypeScript strict mode**
- **Found during:** Task 10 (tsc --noEmit in apps/web)
- **Issue:** `Uint8Array<ArrayBufferLike>` not assignable to `string | BufferSource | null | undefined` for PushManager `applicationServerKey`. TypeScript strict lib types incompatible.
- **Fix:** Added `as unknown as ArrayBuffer` cast — safe at runtime, resolves type mismatch.
- **Files modified:** `apps/web/hooks/use-push-notifications.ts`
- **Commit:** 546abf4

## Self-Check: PASSED

- [x] `push-subscription.repository.ts` exists
- [x] `vapid.transport.ts` exists
- [x] `push-subscription.routes.ts` exists
- [x] `apps/web/public/sw.js` exists
- [x] `apps/web/app/api/push/subscribe/route.ts` exists
- [x] `apps/web/hooks/use-push-notifications.ts` exists
- [x] `apps/web/components/notifications/PushPermissionModal.tsx` exists
- [x] Commit 546abf4 exists
- [x] 81 tests pass
- [x] tsc --noEmit clean in both apps

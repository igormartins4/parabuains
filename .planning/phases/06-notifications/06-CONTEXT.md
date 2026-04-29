# Phase 6: Notifications — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions confirmed by developer)

<domain>
## Phase Boundary

Phase 6 delivers the full notification system:
- Email reminders for friends' birthdays: 1, 3, 7 days before + on the day
- Web Push notifications (VAPID) for birthday reminders
- Email + push for wall messages posted on your profile
- Email + push for friendship requests accepted
- User-configurable: reminder advance days (1/3/7), send time (user sets preferred hour), channels (email/push per event type)
- BullMQ daily scheduler scans upcoming birthdays and enqueues per-user reminder jobs
- Idempotency: `notification_log` unique constraint prevents duplicate sends
- Resend as email provider
- VAPID Web Push with double-confirmation UX (in-app modal before browser prompt)

**NOT in Phase 6:**
- Twitter/WhatsApp notifications (v2)
- Calendar integrations (v2)
- Audit log for notification events (Phase 7)

</domain>

<decisions>
## Implementation Decisions

### D-01: Reminder Advance Options
User can select any combination of: **1 day, 3 days, 7 days** before birthday.
Plus: always receive a notification **on the day** (cannot be disabled per birthday — only per channel).
Stored in `notification_preferences.days_before INT[]` (Phase 1 schema: `DEFAULT '{1,7}'`).

### D-02: Send Time — User-Configurable
User sets their preferred notification hour (0–23) in profile settings.
Stored as `notification_send_hour INT DEFAULT 8` on the `users` table (add in Phase 6 migration).
The BullMQ scheduler uses the **recipient's** timezone + preferred hour to schedule each job.
```sql
ALTER TABLE users ADD COLUMN notification_send_hour INT DEFAULT 8
  CHECK (notification_send_hour >= 0 AND notification_send_hour <= 23);
```

### D-03: Birthday Reminder Scheduler
BullMQ `upsertJobScheduler` creates a repeatable job: runs daily at **00:00 UTC**.
The scheduler job:
1. Queries PostgreSQL for all (recipient, birthday_person) pairs where birthday is within next 8 days
2. For each pair, checks `notification_preferences` (opt-in)
3. Checks `notification_log` for duplicates (idempotency)
4. Enqueues individual delivery jobs to `birthday-reminders` queue with payload:
   `{ recipientId, subjectId, reminderType: 'D7'|'D3'|'D1'|'Dday', scheduledFor: ISO timestamp }`
5. Each job has a `delay` so it fires at the recipient's preferred send time in their timezone

### D-04: Notification Transport Factory
```typescript
// apps/api/src/worker/transports/factory.ts
type TransportType = 'email' | 'push';
interface INotificationTransport {
  send(payload: NotificationPayload): Promise<void>;
}
class NotificationTransportFactory {
  static create(type: TransportType): INotificationTransport {
    if (type === 'email') return new ResendEmailTransport();
    if (type === 'push') return new VapidPushTransport();
    throw new Error(`Unknown transport: ${type}`);
  }
}
```

### D-05: Email Provider — Resend
- Package: `resend` v6.12.2 (already installed in Phase 1)
- Email templates: `@react-email/components` (already installed)
- Sender: `noreply@parabuains.com` (requires Resend domain verification)
- Templates needed:
  - Birthday reminder (D7, D3, D1, Dday variants)
  - Wall message notification
  - Friendship accepted notification
  - Email verification (Phase 2 retroactive — already done)
  - Password reset (Phase 2 retroactive — already done)

### D-06: Web Push — VAPID
- Package: `web-push` v3.6.7 (already installed)
- VAPID keys: generated once (`npx web-push generate-vapid-keys`) and stored in env
- Push subscription stored in `push_subscriptions` table (Phase 1 schema)
- Double-confirmation UX:
  1. App shows in-app modal: "Enable birthday reminders?" with explanation
  2. User clicks "Enable" → app calls `Notification.requestPermission()`
  3. Only if granted → `navigator.serviceWorker.ready.then(sw => sw.pushManager.subscribe(...))`
  4. Subscription endpoint sent to `POST /api/push/subscribe`

### D-07: Notification Preferences UI
Settings page at `apps/web/app/settings/notifications/page.tsx`:
- Per channel (email / push): enable/disable
- Which events trigger notifications: birthday reminders, wall messages, friendship accepted
- Reminder advance days: checkboxes for 1 / 3 / 7
- Preferred send hour: dropdown (00:00 to 23:00)
- Timezone display (read-only — set from profile settings)

### D-08: Idempotency
`notification_log` unique constraint (Phase 1 schema):
```sql
UNIQUE (recipient_id, subject_id, channel, reminder_type, date_trunc('year', sent_at))
```
Before sending, check if record exists. If yes: skip (log as 'skipped'). If no: send → insert log.
Implemented in the BullMQ worker with DB transaction: check + insert + send.

### D-09: Non-Birthday Notification Events
Events beyond birthday reminders:
- `wall.message_posted` → notify profile owner (email + push if enabled)
- `friendship.accepted` → notify requester (email + push if enabled)
These jobs are enqueued by Phase 4 and Phase 5 respectively (stubs already in place).
Phase 6 wires the actual BullMQ consumer processors for these event types.

### D-10: Service Worker
Required for Web Push subscriptions.
`apps/web/public/sw.js` — minimal service worker:
- Handles `push` events → shows notification via `self.registration.showNotification()`
- Handles `notificationclick` → opens profile URL or app URL

Next.js does not auto-generate service workers; use a static file in `public/`.
For PWA install prompt: NOT in scope for Phase 6.

### the agent's Discretion
- React Email template design (keep simple, mobile-friendly)
- BullMQ concurrency setting for worker
- Job retry policy (recommend: 3 retries with exponential backoff)
- Whether to use BullMQ's built-in `removeOnComplete` / `removeOnFail` settings
- Push notification icon/badge URLs

</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/04-social/04-CONTEXT.md` — Social graph (friendship events for notifications)
- `.planning/phases/05-messages/05-CONTEXT.md` — Wall events (message_posted enqueue)
- `.planning/research/ARCHITECTURE.md` — BullMQ worker architecture, notification_log schema, data flow
- `.planning/research/PITFALLS.md` — Push permission UX pitfall, timezone pitfall
- `.planning/ROADMAP.md` — Phase 6 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### Notification API Endpoints (Fastify)
```
GET    /v1/users/me/notification-preferences        → get preferences
PUT    /v1/users/me/notification-preferences        → update preferences
POST   /v1/push/subscribe                           → register push subscription
DELETE /v1/push/subscribe                           → remove push subscription (on logout)
```

### Timezone-Aware Job Scheduling
```typescript
import { DateTime } from 'luxon';

function computeJobDelay(recipientTimezone: string, preferredHour: number): number {
  const now = DateTime.utc();
  const sendAt = DateTime.now()
    .setZone(recipientTimezone)
    .set({ hour: preferredHour, minute: 0, second: 0, millisecond: 0 });
  const adjusted = sendAt < now ? sendAt.plus({ days: 1 }) : sendAt;
  return adjusted.toMillis() - now.toMillis();
}
```

### Birthday Reminder Email Template (React Email sketch)
```tsx
// packages/email-templates/src/birthday-reminder.tsx
export function BirthdayReminderEmail({ recipientName, birthdayPersonName, daysUntil, profileUrl }) {
  return (
    <Html>
      <Body>
        <Text>Hey {recipientName}! 🎂</Text>
        <Text>{birthdayPersonName}'s birthday is in {daysUntil} day(s).</Text>
        <Button href={profileUrl}>Write a message</Button>
      </Body>
    </Html>
  );
}
```

</specifics>

<deferred>
## Deferred Items

- WhatsApp / SMS notifications (v2)
- Google / Apple Calendar integration (v2)
- PWA install prompt (post-MVP)
- Notification center UI (in-app inbox) — stub SSE already in Phase 4

</deferred>

---

*Phase: 06-notifications*
*Context gathered: 2026-04-29 via discuss-phase session*

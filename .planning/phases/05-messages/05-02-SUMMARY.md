---
phase: 05-messages
plan: 02
subsystem: web
tags: [wall-messages, ui, next-js, bff, accessibility, anonymity]
dependency_graph:
  requires: [05-01]
  provides: [wall-ui, compose-modal, wall-settings, approval-inbox]
  affects: [profile-page]
tech_stack:
  added: []
  patterns: [RSC+Client Component split, BFF proxy routes, server-only DAL]
key_files:
  created:
    - apps/web/lib/api/messages.ts
    - apps/web/app/[username]/ComposeMessageModal.tsx
    - apps/web/app/[username]/WallSection.tsx
    - apps/web/app/settings/wall/page.tsx
    - apps/web/app/settings/wall/WallSettingsForm.tsx
    - apps/web/app/settings/wall/pending/page.tsx
    - apps/web/app/settings/wall/pending/PendingMessagesClient.tsx
    - apps/web/app/api/wall/[username]/messages/route.ts
    - apps/web/app/api/wall/settings/route.ts
    - apps/web/app/api/messages/[id]/route.ts
    - apps/web/app/api/messages/[id]/approve/route.ts
    - apps/web/app/api/messages/[id]/reject/route.ts
    - apps/web/app/api/messages/[id]/report/route.ts
  modified:
    - apps/web/app/[username]/page.tsx
decisions:
  - "Used auth.api.getSession + createServiceToken instead of plan's getSession() stub — matches actual project auth pattern"
  - "Added 6 BFF proxy routes not in plan — required by Client Components that call /api/wall/* and /api/messages/*"
  - "Used INTERNAL_API_URL (not NEXT_PUBLIC_API_URL) in server-only DAL — correct for server-side fetches"
  - "isFriend computed from friendshipData.status === 'accepted' for wall canPost logic"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-30"
  tasks_completed: 6
  files_changed: 14
---

# Phase 05 Plan 02: Wall Messages UI Summary

Wall messages UI end-to-end: compose modal with type selector + honeypot, WallSection with anonymous-safe rendering, settings page with 3 toggles, approval inbox.

## What Was Built

### Task 1: API client DAL (`lib/api/messages.ts`)
Server-only module using `auth.api.getSession` + `createServiceToken` (adapted from plan's non-existent `getSession()` stub). Exports 8 functions: `getWallMessages`, `postWallMessage`, `deleteWallMessage`, `approveMessage`, `rejectMessage`, `reportMessage`, `getPendingMessages`, `updateWallSettings`. Uses `INTERNAL_API_URL` for server-side fetches.

### Task 2: ComposeMessageModal
Client Component with message type radio selector (public/private/anonymous), 500-char counter with color states (normal → amber at ≤50 → red over limit), honeypot field (`aria-hidden`, `tabIndex={-1}`), submit disabled when over limit or empty.

### Task 3: WallSection
Client Component with `MessageCard` sub-component. Anonymous messages always render `'Anônimo'` — avatar, author link, and `message.author` data are fully gated behind `!message.isAnonymous`. Delete button shown only for owner or non-anonymous author. Report button for other authenticated users only.

### Task 4: Profile page integration
Added `getWallMessages(username)` fetch to `app/[username]/page.tsx`. `canPost` computed server-side from `friendshipData.status` and `wallWhoCanPost` setting. `WallSection` rendered below mutual friends.

### Task 5: Wall settings page
RSC (`page.tsx`) with auth guard → redirect `/login`. `WallSettingsForm` Client Component with radio group for `wallWhoCanPost`, and two ARIA switch toggles for `wallAllowAnonymous` and `wallRequireApproval`.

### Task 6: Pending approval inbox
RSC with auth guard fetches `getPendingMessages()`. `PendingMessagesClient` renders approve/reject buttons per message. Anonymous messages show `'Anônimo'` in the admin view too (T-05-09 mitigated).

## Deviations from Plan

### Auto-added: BFF proxy routes (Rule 2)
**Found during:** Task 2/3/5/6 implementation
**Issue:** Plan listed only component files. Client Components call `/api/wall/...` and `/api/messages/...` but no BFF routes existed.
**Fix:** Created 6 BFF proxy routes using `bffProxy` utility
**Files:** `app/api/wall/[username]/messages/route.ts`, `app/api/wall/settings/route.ts`, `app/api/messages/[id]/route.ts` (+approve, +reject, +report)

### Auto-fixed: Auth pattern mismatch (Rule 1)
**Found during:** Task 1
**Issue:** Plan's `messages.ts` template used `getSession()` and `session.serviceToken` — neither exists in this codebase.
**Fix:** Used `auth.api.getSession({ headers: await headers() })` + `createServiceToken()` — same pattern as `app/[username]/page.tsx` and `settings/profile/page.tsx`.

## Known Stubs

None — all data flows from the Fastify API via real fetch calls.

## Threat Surface

All T-05-08 through T-05-12 threats from the plan's threat model are mitigated:
- **T-05-08/T-05-09:** `message.isAnonymous` gates all author data in both WallSection and PendingMessagesClient
- **T-05-10:** Content rendered as text via `whitespace-pre-wrap`, never `dangerouslySetInnerHTML`
- **T-05-11:** Honeypot implemented with `aria-hidden` + `tabIndex={-1}`
- **T-05-12:** Delete/approve/reject buttons gated client-side; API re-validates server-side

## Verification Results

- `pnpm type-check` in `apps/web`: **0 errors**
- `pnpm vitest run` in `apps/web`: **23/23 passed**

## Self-Check: PASSED

Files created:
- apps/web/lib/api/messages.ts ✓
- apps/web/app/[username]/ComposeMessageModal.tsx ✓
- apps/web/app/[username]/WallSection.tsx ✓
- apps/web/app/settings/wall/page.tsx ✓
- apps/web/app/settings/wall/WallSettingsForm.tsx ✓
- apps/web/app/settings/wall/pending/page.tsx ✓
- apps/web/app/settings/wall/pending/PendingMessagesClient.tsx ✓

Commits:
- 023356e: feat(05-messages-01): implement Wall Messages API
- 5a482d3: feat(05-messages-02): implement Wall Messages UI

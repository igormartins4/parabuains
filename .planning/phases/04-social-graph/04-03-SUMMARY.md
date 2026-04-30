---
phase: 04-social-graph
plan: 03
subsystem: web-frontend
tags: [nextjs, react, social-graph, bff-proxy, sse, infinite-scroll]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [social-ui, friendship-button, birthday-feed, friends-page, sse-notifications]
  affects: [apps/web/app/[username]/page.tsx]
tech_stack:
  added: []
  patterns:
    - BFF proxy helper (lib/bff.ts) with session auth + service JWT
    - RSC page + Client island pattern (FeedPage + FeedContent + NotificationBadge)
    - useSSENotifications hook with ref-stable callback pattern
    - useFriendshipStatus with optimistic updates via useTransition
    - IntersectionObserver-based infinite scroll in UserSearch
    - 300ms debounce hook for search input
key_files:
  created:
    - apps/web/lib/bff.ts
    - apps/web/lib/api/friendships.ts
    - apps/web/lib/api/feed.ts
    - apps/web/hooks/useFriendshipStatus.ts
    - apps/web/hooks/useSSENotifications.ts
    - apps/web/app/api/friendships/route.ts
    - apps/web/app/api/friendships/[id]/route.ts
    - apps/web/app/api/friendships/[id]/accept/route.ts
    - apps/web/app/api/friendships/pending/route.ts
    - apps/web/app/api/friendships/sent/route.ts
    - apps/web/app/api/friendships/suggestions/route.ts
    - apps/web/app/api/friendships/status/[targetUserId]/route.ts
    - apps/web/app/api/users/search/route.ts
    - apps/web/app/api/feed/birthdays/route.ts
    - apps/web/app/api/notifications/stream/route.ts
    - apps/web/app/feed/page.tsx
    - apps/web/app/feed/BirthdayCard.tsx
    - apps/web/app/feed/NotificationBadge.tsx
    - apps/web/app/friends/page.tsx
    - apps/web/app/friends/PendingRequests.tsx
    - apps/web/app/friends/UserSearch.tsx
    - apps/web/app/[username]/FriendshipButton.tsx
  modified:
    - apps/web/app/[username]/page.tsx
decisions:
  - "BFF routes placed in apps/web/app/api/ (not src/app/api/) — matches actual Next.js app router location"
  - "hooks/ placed at apps/web/hooks/ root (not src/hooks/) — consistent with lib/ location and @/* alias"
  - "useSSENotifications uses onEventRef pattern (useRef) instead of useCallback — avoids infinite re-render loop when callers pass inline functions"
  - "Profile page fetches friendship status server-side via INTERNAL_API_URL directly (not via /api/... client route) for SSR correctness"
  - "bffProxy creates serviceToken per-request from live session — no caching to ensure 60s JWT freshness"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-30"
  tasks_completed: 5
  tasks_total: 5
  files_created: 22
  files_modified: 1
---

# Phase 04 Plan 03: Social UI Summary

## One-liner

Full social UI: BFF proxy routes for friendship/feed/SSE, birthday feed RSC page, friends page with 3-tab layout + 300ms debounce search + IntersectionObserver infinite scroll, FriendshipButton with 4 optimistic states, and real-time NotificationBadge via SSE EventSource.

## Tasks Completed

| Task | Name | Commit |
|------|------|--------|
| 1 | BFF proxy routes (Next.js API routes) | ac9a30d |
| 2 | Client API functions e hooks | 62ab561 |
| 3 | Feed page (RSC + Client islands) | f072d48 |
| 4 | Friends page (lista + pedidos + busca + sugestões) | 9e96b07 |
| 5 | Integração do botão de amizade na página de perfil | 25f5f77 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Auth pattern] Aligned BFF proxy with project's actual auth pattern**
- **Found during:** Task 1
- **Issue:** Plan's `bffProxy` used `await auth()` but project uses `auth.api.getSession({ headers: await headers() })` + `createServiceToken`
- **Fix:** Implemented `bffProxy` matching the existing pattern in `avatar-upload-url/route.ts`
- **Files modified:** `apps/web/lib/bff.ts`

**2. [Rule 2 - Correctness] Used onEventRef pattern in useSSENotifications instead of useCallback**
- **Found during:** Task 2
- **Issue:** Plan's `useCallback(onEvent, [])` with empty deps would cause stale closure issues; violates React hooks rules
- **Fix:** Used `useRef` to track latest callback, updating ref on each render — avoids both stale closure and infinite re-render
- **Files modified:** `apps/web/hooks/useSSENotifications.ts`

**3. [Rule 1 - Path correction] Files placed in apps/web/app/ not apps/web/src/app/**
- **Found during:** Task 1
- **Issue:** Plan references `apps/web/src/app/...` paths but the actual Next.js app router is in `apps/web/app/`
- **Fix:** All files created in their correct locations; @/* alias resolves from apps/web/ root

**4. [Rule 2 - Async params] Next.js 15 params are Promise, not plain object**
- **Found during:** Task 1
- **Issue:** Plan's route handlers used `{ params }: { params: { id: string } }` but Next.js 15 requires `params: Promise<...>`
- **Fix:** Used `.then()` to unwrap params before calling bffProxy in dynamic route handlers

## Known Stubs

- `friends/page.tsx` "Amigos" tab: renders static placeholder text "Lista de amigos — a ser implementada." — no friends list component exists yet. The plan spec only required tabs, PendingRequests, and UserSearch to be functional. A `FriendsList.tsx` component was listed in plan `files_modified` but was not in the task action spec; deferring to future plan.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced beyond what was in the plan's threat model. All BFF routes authenticate before proxying. SSE stream requires valid session. React components do not use `dangerouslySetInnerHTML` (T-04-11 mitigated).

## Self-Check: PASSED

Files exist:
- ✓ apps/web/lib/bff.ts
- ✓ apps/web/lib/api/friendships.ts
- ✓ apps/web/lib/api/feed.ts
- ✓ apps/web/hooks/useFriendshipStatus.ts
- ✓ apps/web/hooks/useSSENotifications.ts
- ✓ apps/web/app/feed/page.tsx
- ✓ apps/web/app/friends/page.tsx
- ✓ apps/web/app/[username]/FriendshipButton.tsx

Commits exist:
- ✓ ac9a30d — BFF proxy routes
- ✓ 62ab561 — Client API + hooks
- ✓ f072d48 — Feed page
- ✓ 9e96b07 — Friends page
- ✓ 25f5f77 — FriendshipButton + profile integration

TypeScript: `pnpm tsc --noEmit` — clean (no output)
Tests: 23/23 passed

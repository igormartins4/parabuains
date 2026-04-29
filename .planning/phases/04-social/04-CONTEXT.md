# Phase 4: Social Graph — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions confirmed by developer)

<domain>
## Phase Boundary

Phase 4 delivers the bilateral friendship system and the birthday feed:
- Send / accept / reject / remove friend requests
- User search by name or username
- Birthday feed: friends' birthdays in the next 30 days, today's birthdays highlighted
- Friend suggestions (friends of friends)
- SSE (Server-Sent Events) for real-time in-app notifications of friend request events
- E-mail notification for friend request accepted (optional, user-configurable in Phase 6 — stub here)
- Private profile model: Instagram-style (visible in search, content locked, accepts friend requests)

**NOT in Phase 4:**
- Wall messages (Phase 5)
- Push notifications / email reminders (Phase 6)
- Notification preference UI (Phase 6)
- Audit log wiring (Phase 7)

</domain>

<decisions>
## Implementation Decisions

### D-01: Friendship Model
Bilateral friendship stored as a single row in `friendships` table (Phase 1 schema):
```
requester_id | addressee_id | status
A            | B            | pending   ← A sent to B
A            | B            | accepted  ← B accepted
```
"Are we friends?" query checks both directions:
```sql
SELECT * FROM friendships
WHERE (requester_id = $1 AND addressee_id = $2)
   OR (requester_id = $2 AND addressee_id = $1)
AND status = 'accepted'
```

### D-02: Friend Request States
- `pending` — sent, awaiting response
- `accepted` — bilateral friendship active
- `blocked` — one party blocked the other (hidden from both sides in most queries)
- Cancelled: requester deletes the row before acceptance

### D-03: Private Profile Model (Instagram-style)
- Profile appears in search (username + display name + avatar)
- Profile page: visiting non-friend sees name + avatar + "Private account" message (NOT 404 in Phase 4 context — only full profile content is locked)
  - Exception: `privacy_level = 'private'` still returns 404 for completely anonymous (unauthenticated) visitors
  - Authenticated non-friends: see minimal profile + "Add friend" button
- Friend requests CAN be sent to private profiles
- Content (birthday, bio, friends list, countdown) hidden until friendship accepted

### D-04: User Search
- Search by display name (ILIKE) or username (ILIKE)
- Returns: id, username, display_name, avatar_url, privacy_level
- Pagination: cursor-based (keyed on username alphabetically)
- Blocked users do NOT appear in search results for each other
- Max results per page: 20

### D-05: Friend Suggestions
Algorithm: friends of friends, excluding existing friends + self + blocked
```sql
SELECT u.id, u.username, u.display_name, u.avatar_url,
       COUNT(*) AS mutual_friend_count
FROM users u
JOIN friendships f1 ON (f1.requester_id = u.id OR f1.addressee_id = u.id)
  AND f1.status = 'accepted'
JOIN friendships f2 ON (f2.requester_id = $myId OR f2.addressee_id = $myId)
  AND f2.status = 'accepted'
  AND (f2.requester_id = u.id OR f2.addressee_id = u.id) -- shared friend
WHERE u.id != $myId
  AND u.id NOT IN (/* already friends */)
GROUP BY u.id ORDER BY mutual_friend_count DESC LIMIT 10;
```

### D-06: Birthday Feed
- Query: friends with birthdays in the next 30 days (from today in viewer's timezone)
- Today's birthdays: separate section at the top, highlighted
- Sort: by day-of-year distance (soonest first)
- Data returned per friend: username, display_name, avatar_url, days_until_birthday, birth_date (MM-DD; full year only if not hidden)
- Endpoint: `GET /v1/feed/birthdays?timezone=America/Sao_Paulo`

### D-07: Notification — Friend Request (SSE)
When user B receives a friend request from A:
1. Fastify API emits an event to a Redis pub/sub channel `notifications:{userId}`
2. Next.js BFF has a SSE endpoint `GET /api/sse/notifications` — subscribes to user's channel
3. Browser keeps SSE connection open; receives `{ type: 'friend_request', from: { ... } }` event
4. Frontend shows in-app toast notification

SSE connection: authenticated only. Auto-reconnect on drop.

### D-08: Friend Request Accepted — Email (Stub)
When friend request is accepted, enqueue a job for "friendship accepted" email.
Phase 4: enqueue to BullMQ queue `notifications` with type `friendship.accepted`.
Phase 6: wire the actual email send.
No email sending in Phase 4.

### D-09: Friend Limits
No hard limit on number of friends per account (MVP decision).

### D-10: Blocking
`blocked` status is set when a user blocks another.
- Blocked users cannot send friend requests
- Blocked users don't appear in search results for each other
- Block is one-directional in the status but symmetric in effect (store blocker → blockee direction)
- No UI for block management in Phase 4 — just the data model and enforcement in queries

### the agent's Discretion
- SSE keepalive interval (recommend 30s ping)
- Redis pub/sub channel naming convention
- Pagination token format (opaque base64 cursor)
- Feed caching strategy (short TTL on RSC cache, ~60s)

</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/03-profiles/03-CONTEXT.md` — Profile decisions (privacy model, username)
- `.planning/phases/02-auth/02-CONTEXT.md` — Auth decisions (service token, session)
- `.planning/research/ARCHITECTURE.md` — DB schema, friendships table, Redis pub/sub
- `.planning/ROADMAP.md` — Phase 4 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### Friendship API Endpoints (Fastify)
```
POST   /v1/friendships              → send friend request { targetUsername }
PATCH  /v1/friendships/:id          → accept | reject | block { action }
DELETE /v1/friendships/:id          → remove friend / cancel request
GET    /v1/users/me/friends         → list friends (paginated)
GET    /v1/users/me/friend-requests → incoming pending requests
GET    /v1/feed/birthdays           → birthday feed (next 30 days)
GET    /v1/users/suggestions        → friend suggestions (friends of friends)
GET    /v1/users/search?q=          → user search
```

### SSE Endpoint (Next.js BFF)
```typescript
// apps/web/app/api/sse/notifications/route.ts
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const stream = new ReadableStream({ ... subscribe to Redis channel ... });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

### Birthday Feed Query Optimization
The `idx_users_birth_date` index from Phase 1 schema covers this query.
Query by `EXTRACT(DOY FROM birth_date)` range for the next 30 days — handle year wrap (Dec → Jan).

</specifics>

<deferred>
## Deferred Items

- Email send for friendship.accepted (Phase 6 wires the BullMQ consumer)
- Push notification for friend requests (Phase 6)
- Block management UI (post-MVP)
- Activity feed / social timeline (out of scope v1)

</deferred>

---

*Phase: 04-social*
*Context gathered: 2026-04-29 via discuss-phase session*

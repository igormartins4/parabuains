# Phase 5: Message Wall — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions confirmed by developer)

<domain>
## Phase Boundary

Phase 5 delivers the birthday message wall:
- Post public, private, or anonymous messages on a friend's profile wall
- Wall owner can configure: who can post (friends / all authenticated), whether anonymous is allowed, whether messages need pre-approval
- Wall owner can delete any message on their wall
- Any user can report a message as inappropriate
- Server-side HTML/XSS sanitization before saving
- In-app + optional push notification when someone posts on your wall (enqueue job)
- Character limit: 500 per message

**NOT in Phase 5:**
- Notification delivery (Phase 6 wires BullMQ consumers)
- Reactions/likes on messages (v2)
- Rich media (images, GIFs) in messages (out of scope v1)
- Audit log wiring (Phase 7)

</domain>

<decisions>
## Implementation Decisions

### D-01: Message Types
Three types chosen at send time by the author:
- `public` — visible to all visitors who can see the profile
- `private` — visible only to the profile owner (and the author, in their sent view)
- `anonymous` — public visibility, but author identity hidden from profile owner (server records author_id for moderation)

### D-02: Wall Configuration (per profile owner)
Three settings configurable by the wall owner in profile settings:
1. **`wall_who_can_post`**: `'friends'` | `'authenticated'` (default: `'friends'`)
2. **`wall_allow_anonymous`**: boolean (default: `true`)
3. **`wall_require_approval`**: boolean (default: `false`)

These are stored as columns on the `users` table (add in Phase 5 migration):
```sql
ALTER TABLE users ADD COLUMN wall_who_can_post VARCHAR(20) DEFAULT 'friends'
  CHECK (wall_who_can_post IN ('friends', 'authenticated'));
ALTER TABLE users ADD COLUMN wall_allow_anonymous BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN wall_require_approval BOOLEAN DEFAULT FALSE;
```

### D-03: Message Approval Flow
When `wall_require_approval = true`:
- New messages are saved with `status = 'pending'`
- Profile owner sees a "pending approval" inbox in their wall settings
- Owner approves or rejects each message
- Approved messages become `status = 'published'`; rejected are soft-deleted

Add `status` column to `wall_messages` in Phase 5 migration:
```sql
ALTER TABLE wall_messages ADD COLUMN status VARCHAR(20) DEFAULT 'published'
  CHECK (status IN ('pending', 'published', 'rejected'));
```

### D-04: Anonymous Message Enforcement
When `wall_allow_anonymous = false`:
- API rejects requests with `is_anonymous = true` with 400 Bad Request
- Frontend hides the "send anonymously" option in the compose UI

### D-05: XSS Sanitization
Use `dompurify` (server-side via `isomorphic-dompurify`) or `sanitize-html` to strip all HTML tags.
Messages are stored as **plain text only** — no HTML, no markdown.
Sanitization happens in the Fastify service layer before persistence, NOT in the route handler.

### D-06: Message Reporting
`POST /v1/messages/:id/report { reason: string }` — creates a `message_reports` table entry.
No moderation UI in Phase 5 — just data collection.
Auto-hide: if a message receives 5+ reports, set `status = 'pending'` (re-queues for owner review).

```sql
CREATE TABLE message_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES wall_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, reporter_id)  -- one report per user per message
);
```

### D-07: Wall Notification (Enqueue Only)
When a message is posted (and approved/published):
- Enqueue a BullMQ job: `{ type: 'wall.message_posted', profileId, authorId, messageId }`
- Phase 6 wires the actual send
- No notification send in Phase 5

### D-08: Message Character Limit
Hard limit: **500 characters**
Enforced at:
1. DB level: `CHECK (char_length(content) <= 500)` (already in Phase 1 schema)
2. API level: Fastify JSON Schema validation `maxLength: 500`
3. Frontend: character counter in compose UI

### D-09: Who Can Read What
- **Public messages:** visible to anyone who can see the profile (respects profile privacy level)
- **Private messages:** visible only to the profile owner (and the original author for their reference)
- **Anonymous messages:** visible publicly, but `author_id` is never exposed in API responses (only server-side for moderation)

### D-10: Message Deletion
- Profile owner can delete any message on their wall (soft delete: `deleted_at`)
- Author can delete their own non-anonymous message (soft delete)
- Hard delete: never in v1

### the agent's Discretion
- Compose UI placement on profile page (modal vs inline form)
- Message feed pagination (cursor-based, keyed on `created_at`)
- Pending approval badge/indicator on profile page
- Report reason options (enum vs free text — recommend enum: spam, harassment, inappropriate, other)

</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/04-social/04-CONTEXT.md` — Social graph decisions (friendship model, privacy)
- `.planning/phases/03-profiles/03-CONTEXT.md` — Profile decisions (privacy levels)
- `.planning/research/ARCHITECTURE.md` — DB schema (wall_messages table), BullMQ patterns
- `.planning/ROADMAP.md` — Phase 5 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### Wall API Endpoints (Fastify)
```
GET    /v1/users/:username/wall            → list published messages (paginated, respects privacy)
POST   /v1/users/:username/wall            → post a message { content, type: public|private|anonymous }
DELETE /v1/messages/:id                    → delete message (owner or author)
PATCH  /v1/messages/:id/approve            → approve pending message (wall owner only)
PATCH  /v1/messages/:id/reject             → reject pending message (wall owner only)
POST   /v1/messages/:id/report             → report message
GET    /v1/users/me/wall/pending           → get pending approval queue
PUT    /v1/users/me/wall/settings          → update wall_who_can_post, wall_allow_anonymous, wall_require_approval
```

### Anonymous Message Response
API response for anonymous messages MUST strip `author_id` and `author` from the payload:
```typescript
// In MessageService.formatForResponse()
if (message.isAnonymous) {
  return { ...message, authorId: undefined, author: undefined };
}
```
This must be enforced at the service layer, not the route layer, to prevent accidental exposure.

### Sanitization Library
```typescript
import sanitizeHtml from 'sanitize-html';

function sanitizeMessage(content: string): string {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim();
}
```
Install: `pnpm add sanitize-html` + `pnpm add -D @types/sanitize-html` in `apps/api`.

</specifics>

<deferred>
## Deferred Items

- Notification send for wall messages (Phase 6)
- Moderation dashboard UI (post-MVP)
- Rich media in messages (v2)
- Reactions/likes (v2)

</deferred>

---

*Phase: 05-messages*
*Context gathered: 2026-04-29 via discuss-phase session*

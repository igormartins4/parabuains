# Phase 3: User Profiles — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions confirmed by developer)

<domain>
## Phase Boundary

Phase 3 delivers complete user profile management and public profile pages:
- Profile edit API: display name, username, bio, birthday, avatar, privacy settings
- Public profile page at `/[username]` (Next.js App Router dynamic route)
- Avatar upload: client → Next.js BFF → Cloudflare R2 (presigned URL) + Sharp server-side resize
- Privacy controls: public / friends-only / private (404 for unauthorized on private)
- Birthday countdown: configurable visibility (public by default, can be friends-only)
- OG card: dynamic Open Graph image generated server-side for profile sharing
- Username rules: 3-30 chars, `[a-z0-9_-]`, case-insensitive; mutable (old URL → 410 Gone)
- Friends-in-common display on profile page (when viewer is authenticated)
- Birth year hidden by default for non-friends (LGPD)

**NOT in Phase 3:**
- Friend list / social graph (Phase 4)
- Wall messages on profile (Phase 5)
- Notification preferences (Phase 6)
- Any messaging or notification features

</domain>

<decisions>
## Implementation Decisions

### D-01: Username Format
- 3–30 characters
- Allowed: `[a-z0-9_-]` (lowercase letters, digits, underscore, hyphen)
- Case-insensitive (stored lowercase, compared with LOWER())
- Reserved: `admin`, `api`, `static`, `health`, `auth`, `login`, `register`, `settings`, `feed`, `notifications`
- Unique constraint in DB (already in Phase 1 schema)

### D-02: Username Mutability
- User can change username at any time (no cooldown)
- Old username URL (`/old-name`) returns **410 Gone** (not 301/302)
- Store username history in `username_history` table to serve 410s

### D-03: Avatar Upload Flow
1. Client requests presigned R2 URL from `POST /api/profile/avatar-upload-url`
2. BFF validates auth + file type (image/jpeg, image/png, image/webp only)
3. BFF calls Fastify API to generate presigned URL
4. Fastify API generates R2 presigned PUT URL (using `@aws-sdk/client-s3` with R2 endpoint)
5. Client uploads directly to R2 via presigned URL
6. Client notifies BFF upload complete: `POST /api/profile/avatar-confirm`
7. BFF downloads from R2, processes with **Sharp** (resize to 400×400, convert to webp, strip EXIF)
8. BFF re-uploads processed file to R2 final path: `avatars/{userId}/avatar.webp`
9. Fastify API updates `users.avatar_url`

Max file size: 5MB (enforced at presigned URL generation).

### D-04: Privacy Levels
Three levels (matches Phase 1 DB schema `privacy_level`):
- `public` — anyone can see full profile
- `friends` — only accepted friends see full profile; others see name + avatar only
- `private` — returns 404 for non-authenticated OR non-friends; appears in search (see D-05)

### D-05: Private Profile in Search
Private profiles appear in user search results (username + display name only).
Friend requests CAN be sent to private profiles.
Profile page returns 404 for unauthorized viewers (NOT 403 — per AGENTS.md constraint).

### D-06: Birthday Countdown Visibility
- Configurable by profile owner
- **Default:** `public` (visible to everyone on the profile page)
- Options: `public` | `friends`
- Stored in `users` table as `countdown_visibility VARCHAR(20) DEFAULT 'public'`
- If `friends` and viewer is not a friend: countdown hidden, show "🎂 Birthday coming soon" placeholder

### D-07: OG Card — Dynamic
Generate dynamic Open Graph image for each profile page:
- Technology: **`@vercel/og`** (uses Satori under the hood, works in Next.js Edge Runtime)
- Route: `apps/web/app/og/[username]/route.ts` → returns PNG
- Content: display name, avatar (fetched from R2), countdown days, birthday date (without year if hidden)
- Fallback: if avatar fails to load, use initials-based placeholder
- Cache: `Cache-Control: public, max-age=3600` (1h cache)

### D-08: Sharing Button
"Share profile" button on public profile page copies the canonical URL to clipboard.
Canonical URL: `https://parabuains.com/{username}`
The OG card (D-07) is what social networks (WhatsApp, Twitter, Telegram) display when the link is shared.

### D-09: Friends in Common
On a profile page, if the viewer is authenticated, show mutual friends count + up to 5 avatars.
API: `GET /v1/users/:username/mutual-friends?viewerId=...`
Returns: `{ count: number, sample: User[] }`

### D-10: Birth Year Privacy (LGPD)
- `birth_year_hidden` defaults to `true` in DB (Phase 1 schema)
- Non-friends see only MM-DD ("March 15")
- Friends see full date ("March 15, 1990") if `birth_year_hidden = false`
- User can toggle in profile settings

### D-11: Username History Table
```sql
CREATE TABLE username_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username    VARCHAR(30) NOT NULL,
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_username_history_username ON username_history(username);
```
Used to serve 410 Gone for old usernames.

### the agent's Discretion
- Profile page layout and component breakdown
- Avatar placeholder (initials-based SVG)
- Skeleton loading states for profile page
- R2 bucket naming and path structure
- Sharp resize quality settings

</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/02-auth/02-CONTEXT.md` — Auth decisions (session, service token)
- `.planning/research/ARCHITECTURE.md` — DB schema, BFF pattern, security layers
- `.planning/research/STACK.md` — Stack versions (@aws-sdk/client-s3, Sharp, @vercel/og)
- `.planning/ROADMAP.md` — Phase 3 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### Profile API Endpoints (Fastify)
```
GET    /v1/users/:username          → public profile (respects privacy)
PUT    /v1/users/me/profile         → update profile (auth required)
POST   /v1/users/me/avatar          → confirm avatar upload + trigger Sharp processing
GET    /v1/users/:username/mutual-friends → mutual friends (auth required)
POST   /v1/users/me/username        → change username (validates format + uniqueness)
```

### Privacy Middleware Pattern (Fastify)
```typescript
// In UserService.getProfile()
if (user.privacyLevel === 'private' && !isFriend && !isSelf) {
  throw new NotFoundError(); // 404, not 403
}
if (user.privacyLevel === 'friends' && !isFriend && !isSelf) {
  return publicMinimalProfile(user); // name + avatar only
}
return fullProfile(user);
```

### Next.js Profile Page Route
```
apps/web/app/[username]/page.tsx      ← RSC, server-rendered
apps/web/app/[username]/opengraph-image.tsx  ← @vercel/og OG image
apps/web/app/settings/profile/page.tsx  ← profile edit form
```

### Countdown Calculation
```typescript
function daysUntilBirthday(birthDate: Date, timezone: string): number {
  const now = DateTime.now().setZone(timezone);
  const nextBirthday = DateTime.fromObject(
    { month: birthDate.getMonth() + 1, day: birthDate.getDate(), year: now.year },
    { zone: timezone }
  );
  const adjusted = nextBirthday < now ? nextBirthday.plus({ years: 1 }) : nextBirthday;
  return Math.ceil(adjusted.diff(now, 'days').days);
}
```
Use `luxon` for timezone-aware date math.

</specifics>

<deferred>
## Deferred Items

- Friends list display on profile (Phase 4 — requires social graph)
- Wall messages section on profile (Phase 5)
- Push subscription prompt (Phase 6)
- Notification when someone views profile (out of scope v1)

</deferred>

---

*Phase: 03-profiles*
*Context gathered: 2026-04-29 via discuss-phase session*

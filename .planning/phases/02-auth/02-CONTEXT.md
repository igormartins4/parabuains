# Phase 2: Authentication & Security Foundation — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions confirmed by developer)

<domain>
## Phase Boundary

Phase 2 delivers a complete, secure authentication system on top of the Phase 1 monorepo:
- better-auth wired in Next.js BFF (not in Fastify directly)
- Email/password registration with e-mail verification gate (blocked until verified)
- Google OAuth login (Twitter/X deferred — see D-08)
- Session with access token (15min) + refresh token (30 days) rotation
- 2FA TOTP — always optional; required only if user has it enabled, for sensitive ops
- Account lockout after 10 failed attempts in 15min → 30min block
- Honeypot fields on all auth forms
- 8 one-time backup codes for 2FA recovery (shown once, stored hashed)
- BFF ↔ Fastify service token flow (short-lived JWT, 60s)
- UI: login, register, forgot-password, reset-password, 2FA setup, 2FA prompt pages

**NOT in Phase 2:**
- Twitter/X OAuth (deferred — see D-08)
- Profile setup/edit (Phase 3)
- Any social or messaging features
- Notification preferences (Phase 6)
- Audit log hook wiring (Phase 7)
- Full 2FA enforcement on all ops (Phase 7) — Phase 2 sets up the mechanism

</domain>

<decisions>
## Implementation Decisions

### D-01: Auth Library — better-auth (in Next.js BFF)
Use **better-auth** v1.6.9. Configured in `apps/web/lib/auth.ts` (server-side).
better-auth runs inside Next.js, NOT inside Fastify.
Fastify validates service tokens issued by the BFF.

### D-02: Session Tokens
- **Access token:** 15 minutes expiry
- **Refresh token:** 30 days expiry, rotation on every use
- Stored in httpOnly + Secure + SameSite=Strict cookies

### D-03: Email Verification Gate
New accounts cannot access any protected route until email is verified.
better-auth `emailVerification` plugin enabled.
Verification link expires in 24h.

### D-04: Google OAuth Only (Phase 2)
Implement only **Google OAuth** in Phase 2.
Twitter/X OAuth is deferred (API instability + cost concerns).

### D-05: 2FA — Optional, TOTP-based
- User can enable TOTP 2FA from account settings
- 2FA is NOT forced at login for all users
- **Sensitive operations** (change email, disable 2FA, delete account) require TOTP code IF the user has 2FA enabled
- Library: `otpauth` (TOTP) + QR code generation via `qrcode`

### D-06: 2FA Backup Codes
- Generate **8 one-time backup codes** on 2FA activation
- Show to user exactly once; never shown again
- Store hashed (bcrypt) in `totp_backup_codes` table
- One code = one use; mark used on consumption

### D-07: Account Lockout
- 10 failed login attempts in 15 minutes → account locked for 30 minutes
- Track per email + per IP (Redis counters via `@fastify/rate-limit` on the BFF side)
- Generic error messages: never reveal whether email exists

### D-08: Twitter/X OAuth — Deferred
Twitter/X OAuth removed from Phase 2 scope.
REQUIREMENTS.md AUTH-04 remains as a requirement; implement in a future phase or v2.
`TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` remain in `.env.example` as placeholders.

### D-09: Honeypot Fields
All auth forms (register, login, forgot-password) include a hidden `website` field.
If submitted non-empty, silently reject the request (return success, do nothing).

### D-10: BFF ↔ Fastify Service Token
Next.js BFF issues a **short-lived JWT (60s)** signed with `API_JWT_SECRET` to call Fastify API.
Fastify verifies this token via `@fastify/jwt` before processing any request.
The service token carries: `{ sub: userId, sessionId, iat, exp }`.

### D-11: Password Rules
- Minimum 8 characters
- No maximum (truncate at 72 for bcrypt compatibility — log a warning if > 72)
- bcrypt cost factor: 12
- better-auth handles hashing internally

### D-12: Forgot Password
- Token-based reset link via email (Resend, configured in Phase 6 — use nodemailer/SMTP fallback or stub in Phase 2)
- Reset token expires in 1 hour
- One-time use

### the agent's Discretion
- better-auth plugin configuration order
- Session cookie names
- Error response shapes (keep consistent with Fastify error format)
- UI component library choice (keep minimal — Tailwind v4 only, no component lib)
- Form validation library (zod + react-hook-form recommended)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (stack versions, module structure)
- `.planning/research/ARCHITECTURE.md` — Security layers, BFF pattern, service token flow
- `.planning/research/STACK.md` — better-auth version and configuration reference
- `.planning/ROADMAP.md` — Phase 2 success criteria
- `.planning/PROJECT.md` — Core constraints

</canonical_refs>

<specifics>
## Specific Ideas

### better-auth Configuration (apps/web/lib/auth.ts)
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  socialProviders: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  plugins: [twoFactor()],
});
```

### Fastify Auth Guard
`apps/api/src/plugins/auth.ts` — Fastify preHandler hook:
```typescript
fastify.addHook('preHandler', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});
```
Routes that don't need auth are decorated with `{ onRequest: [] }` to skip the hook.

### DB Tables needed for better-auth
better-auth with Drizzle adapter needs its own tables. Use `npx better-auth generate` to produce migration.
Key tables: `user`, `session`, `account`, `verification` (better-auth naming convention).
These coexist with the `users` table from Phase 1 schema — better-auth may use its own `user` table.
**Decision:** Use better-auth's generated schema as the canonical user table; reconcile naming with Phase 1 schema at migration time.

### Backup Codes Table (not in Phase 1 schema)
```sql
CREATE TABLE totp_backup_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  VARCHAR(255) NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Add this migration in Phase 2.

### Email Sending in Phase 2
Resend SDK is installed (Phase 1). Configure it now for verification emails and password reset.
`RESEND_API_KEY` must be set. Use `noreply@parabuains.com` as sender (configure domain in Resend dashboard).

</specifics>

<deferred>
## Deferred Items

- Twitter/X OAuth — future phase
- Full audit log wiring — Phase 7
- 2FA enforcement on ALL sensitive ops (beyond email/disable/delete) — Phase 7
- Rate limiting tuning and anomaly detection rules — Phase 7
- Notification preferences for auth events — Phase 6

</deferred>

---

*Phase: 02-auth*
*Context gathered: 2026-04-29 via discuss-phase session*

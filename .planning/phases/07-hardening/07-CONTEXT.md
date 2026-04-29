# Phase 7: Security Hardening & Polish — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Discuss-phase session (decisions confirmed by developer)

<domain>
## Phase Boundary

Phase 7 is the final phase — security audit, cross-cutting hardening, and product polish:
- Audit log: Fastify `onResponse` hook writing to `audit_logs` table for all sensitive actions
- Anomaly detection: threshold-based rules (no external service — zero additional cost)
- 2FA enforcement on sensitive operations (change email, disable 2FA, delete account)
- 8 backup codes generation at 2FA activation (if not done in Phase 2)
- Rate limiting audit: verify all mutation endpoints are covered
- Input sanitization audit: verify all user inputs are sanitized
- 90-day audit log retention cleanup job (BullMQ scheduled)
- Performance polish: loading states, error boundaries, accessibility improvements
- CSP headers audit and tightening

**NOT in Phase 7:**
- New features
- External SIEM integration (Datadog, etc.) — use structured Pino logs only
- Paid anomaly detection services

</domain>

<decisions>
## Implementation Decisions

### D-01: Audit Log — Fastify onResponse Hook
Hook registered globally in Fastify. Records:
- Sensitive actions: `user.login`, `user.logout`, `user.register`, `user.delete`, `user.email_change`, `user.password_change`, `user.2fa_enable`, `user.2fa_disable`, `friendship.create`, `friendship.accept`, `message.delete`, `message.report`
- Fields: `actor_id`, `action`, `resource` (e.g. `user:{uuid}`), `ip_address`, `user_agent`, `metadata (JSONB)`, `created_at`
- Non-sensitive routes are NOT logged (GET endpoints, health check)

Implementation: Fastify plugin `apps/api/src/plugins/audit.ts`:
```typescript
fastify.addHook('onSend', async (request, reply, payload) => {
  if (request.auditAction) {
    await auditRepo.insert({ actorId: request.user?.id, action: request.auditAction, ... });
  }
});
// Routes decorate the request: request.auditAction = 'user.login'
```

### D-02: Audit Log Retention
- Retention: **90 days**
- Cleanup: BullMQ scheduled job runs daily at 03:00 UTC
- Job: `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'`
- Batched deletes (1000 rows at a time) to avoid lock contention

### D-03: Anomaly Detection — Threshold-Based (Zero Cost)
Rules enforced in Fastify service layer using Redis counters:

| Anomaly | Threshold | Window | Action |
|---------|-----------|--------|--------|
| Failed logins per IP | 20 | 1 hour | Block IP for 1h + log `anomaly.login_flood` |
| Failed logins per email | 10 | 15 min | Lock account 30min (already in Phase 2) |
| Messages sent per user | 50 | 1 hour | Rate limit 429 + log `anomaly.message_flood` |
| Friend requests sent | 30 | 1 hour | Rate limit 429 + log `anomaly.friendship_flood` |
| Password reset requests | 5 | 1 hour | Silent ignore + log `anomaly.reset_flood` |

Anomaly events are logged to `audit_logs` with `action = 'anomaly.*'`.
No external alerting in MVP — anomalies are visible via Pino structured logs.
Admin can query: `SELECT * FROM audit_logs WHERE action LIKE 'anomaly.%' ORDER BY created_at DESC`.

### D-04: 2FA Enforcement on Sensitive Operations
Sensitive operations that require TOTP verification IF user has 2FA enabled:
1. Change email address
2. Disable 2FA
3. Delete account

Pattern in Fastify service layer:
```typescript
async changeEmail(userId: string, newEmail: string, totpCode?: string) {
  const user = await this.userRepo.findById(userId);
  if (user.totpEnabled) {
    if (!totpCode) throw new TotpRequiredError();
    if (!this.totpService.verify(user.totpSecret, totpCode)) throw new InvalidTotpError();
  }
  // proceed with change
}
```

### D-05: Rate Limiting Audit Checklist
Verify `@fastify/rate-limit` is applied to ALL these endpoints (not just login):
- `POST /v1/auth/*` — 10 req/min per IP
- `POST /v1/users/:username/wall` — 20 req/hour per userId
- `POST /v1/friendships` — 30 req/hour per userId
- `POST /v1/auth/forgot-password` — 5 req/hour per IP
- `PUT /v1/users/me/profile` — 30 req/min per userId
- `POST /v1/messages/:id/report` — 10 req/hour per userId

### D-06: CSP Headers Tightening
Review and tighten Content Security Policy in Next.js middleware:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{nonce}';
  style-src 'self' 'unsafe-inline';  ← Tailwind requires this
  img-src 'self' data: https://*.r2.dev https://*.cloudflare.com;
  connect-src 'self' https://api.resend.com;
  font-src 'self';
  frame-ancestors 'none';
```

### D-07: Input Sanitization Audit
Audit all Fastify endpoints for:
1. `content` fields → must pass through `sanitize-html` (Phase 5 covers wall messages)
2. `username` → regex validation `[a-z0-9_-]` (Phase 3)
3. `bio` → strip HTML tags, max 300 chars (Phase 3)
4. `display_name` → strip HTML, max 100 chars
5. File upload → MIME type + extension validation (Phase 3)
6. Search query (`q`) → max 100 chars, escape LIKE wildcards

### D-08: Performance Polish
- All list pages: loading skeletons (Tailwind CSS `animate-pulse`)
- All async operations: error boundaries in Next.js (`error.tsx`)
- Profile page: `generateStaticParams` for top users (ISR with 1h revalidation)
- Images: Next.js `<Image>` component with `priority` on above-fold avatars
- Feed: React Query with `staleTime: 60_000`

### D-09: Accessibility
- All interactive elements: keyboard navigable (Tab order correct)
- Images: meaningful `alt` text
- Forms: associated `<label>` for every `<input>`
- ARIA roles where needed (toast notifications, modals, SSE alerts)
- Color contrast: WCAG AA minimum

### the agent's Discretion
- Pino log level configuration per environment
- Whether to add `helmet` CSP plugin to Next.js middleware vs manual headers
- Test coverage targets (recommend 70%+ for service layer)
- Whether to add `pg_stat_statements` monitoring queries to the health endpoint

</decisions>

<canonical_refs>
## Canonical References

- ALL prior phase CONTEXTs — Phase 7 audits all prior decisions
- `.planning/research/ARCHITECTURE.md` — Security layers, audit_logs schema, anomaly detection rules
- `.planning/research/PITFALLS.md` — Known pitfalls to verify are mitigated
- `.planning/ROADMAP.md` — Phase 7 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### Audit Log Fastify Plugin
```typescript
// apps/api/src/plugins/audit.ts
import fp from 'fastify-plugin';

export const auditPlugin = fp(async (fastify) => {
  fastify.decorateRequest('auditAction', null);
  fastify.decorateRequest('auditResource', null);

  fastify.addHook('onSend', async (request, reply) => {
    if (!request.auditAction) return;
    if (reply.statusCode >= 400) return; // only log successful ops
    await fastify.db.insert(auditLogs).values({
      actorId: request.user?.sub ?? null,
      action: request.auditAction,
      resource: request.auditResource ?? null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      metadata: request.auditMetadata ?? null,
    });
  });
});
```

### Anomaly Detection Redis Pattern
```typescript
// In AuthService.recordFailedLogin()
const key = `anomaly:login:ip:${ip}`;
const count = await redis.incr(key);
await redis.expire(key, 3600); // 1h window
if (count > 20) {
  await this.auditRepo.log({ action: 'anomaly.login_flood', metadata: { ip, count } });
  throw new TooManyRequestsError();
}
```

### Cleanup Job
```typescript
// In worker: apps/api/src/worker/jobs/cleanup-audit-logs.ts
export async function cleanupAuditLogs(db: DrizzleDB) {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let deleted = 0;
  do {
    const result = await db.delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoff))
      .limit(1000);
    deleted = result.rowCount ?? 0;
  } while (deleted === 1000);
}
```

</specifics>

<deferred>
## Deferred Items

- External SIEM/alerting integration (Datadog, Axiom) — post-MVP
- Automated security scanning (Snyk, OWASP ZAP) — post-MVP CI pipeline
- GDPR data export / right-to-erasure endpoint — post-MVP

</deferred>

---

*Phase: 07-hardening*
*Context gathered: 2026-04-29 via discuss-phase session*

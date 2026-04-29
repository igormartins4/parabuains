# Deferred Items — Phase 02 Auth

## Pre-existing test failures (out of scope for 02-04)

### totp-backup.test.ts — bcrypt timeout
- **File:** `apps/web/lib/__tests__/totp-backup.test.ts`
- **Tests failing:** `gera exatamente 8 codigos` and `hashes sao validos bcrypt`
- **Cause:** bcrypt with cost factor 12 takes >5000ms (default vitest timeout) in CI/dev environment
- **Introduced by:** Plan 02-03
- **Fix:** Increase testTimeout in vitest.config.ts or reduce bcrypt cost factor in tests to `4`
- **Priority:** Low — pre-existing, not blocking

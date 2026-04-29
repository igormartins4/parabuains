---
phase: "02"
plan: "04"
subsystem: "web/auth-ui, web/bff, api/auth"
tags: ["auth", "pages", "middleware", "redis", "jwt", "bff"]
dependency_graph:
  requires: ["02-01", "02-02", "02-03"]
  provides: ["auth-pages", "account-lockout", "service-token", "api-client", "fastify-auth-plugin", "next-middleware"]
  affects: ["all protected routes", "BFF→API communication"]
tech_stack:
  added: ["ioredis@5.10.1", "jose (SignJWT)"]
  patterns: ["honeypot anti-bot", "fail-open Redis lockout", "short-lived JWT BFF tokens", "Fastify preHandler auth hook", "Next.js Edge Middleware"]
key_files:
  created:
    - "apps/web/app/(auth)/layout.tsx"
    - "apps/web/app/(auth)/login/page.tsx"
    - "apps/web/app/(auth)/register/page.tsx"
    - "apps/web/app/(auth)/forgot-password/page.tsx"
    - "apps/web/app/(auth)/reset-password/page.tsx"
    - "apps/web/app/(auth)/verify-2fa/page.tsx"
    - "apps/web/lib/account-lockout.ts"
    - "apps/web/lib/service-token.ts"
    - "apps/web/lib/api-client.ts"
    - "apps/web/middleware.ts"
    - "apps/api/src/plugins/auth.ts"
    - "apps/web/lib/__tests__/account-lockout.test.ts"
    - "apps/web/lib/__tests__/service-token.test.ts"
  modified:
    - "apps/api/src/app.ts"
    - "apps/api/src/modules/health/routes.ts"
    - "apps/web/package.json"
    - "pnpm-lock.yaml"
decisions:
  - "jose TextEncoder must be imported from 'util' (Node native) in server-side code to avoid jsdom Uint8Array prototype mismatch in vitest"
  - "verify-2fa page uses authClient.twoFactor.verifyTotp inline rather than a separate component (TwoFactorVerify not yet needed)"
  - "service-token.test.ts uses @vitest-environment node because jose Web Crypto API requires Node's native Uint8Array"
metrics:
  duration: "~15 min"
  completed: "2026-04-29"
---

# Phase 02 Plan 04: Auth UI, BFF Token & API Security Summary

Auth pages, account lockout (Redis), JWT BFF service token, Fastify auth plugin, and Next.js edge middleware implemented with honeypot protection and fail-open security design.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Instalar dependências | `0ff94f0` | package.json, pnpm-lock.yaml |
| 2 | Auth layout + login/register pages | `ebb49b7` | (auth)/layout.tsx, login/page.tsx, register/page.tsx |
| 3 | forgot-password, reset-password, verify-2fa | `ec72095` | 3 auth pages |
| 4 | Account lockout Redis | `fa7614d` | lib/account-lockout.ts |
| 5 | BFF service token + api-client | `1b97c54` | lib/service-token.ts, lib/api-client.ts |
| 6 | Fastify auth preHandler plugin | `fea8e54` | plugins/auth.ts, app.ts, health/routes.ts |
| 7 | Next.js middleware | `a437f35` | middleware.ts |
| 8 | Criar testes | `9a6dfe5` | __tests__/account-lockout.test.ts, service-token.test.ts |
| Fix | TextEncoder jsdom/Node fix | `1b594a8` | service-token.ts, service-token.test.ts |

## Test Results

**15/15 testes passam** nos arquivos relevantes ao plano:
- `account-lockout.test.ts`: 5/5 ✅
- `service-token.test.ts`: 2/2 ✅
- `auth.test.ts`: 2/2 ✅ (pré-existente)
- `auth-oauth.test.ts`: 2/2 ✅ (pré-existente)
- `email.test.ts`: 4/4 ✅ (pré-existente)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jose TextEncoder Uint8Array prototype mismatch in jsdom**
- **Found during:** Task 9 (running tests)
- **Issue:** `jose@6.x` usa Web Crypto API e exige `Uint8Array` nativo do Node. No ambiente jsdom, `new TextEncoder().encode()` retorna um `Uint8Array` do contexto web que não satisfaz a verificação `instanceof Uint8Array` do Node, causando `TypeError: payload must be an instance of Uint8Array`
- **Fix:** Import `TextEncoder` de `'util'` (Node nativo) em `service-token.ts`; adicionar `// @vitest-environment node` no arquivo de teste
- **Files modified:** `apps/web/lib/service-token.ts`, `apps/web/lib/__tests__/service-token.test.ts`
- **Commit:** `1b594a8`

## Deferred Issues (pre-existing, out of scope)

| File | Issue | Origin Plan |
|------|-------|-------------|
| `lib/__tests__/totp-backup.test.ts` | 2 tests timeout (bcrypt cost=12 > 5000ms default) | 02-03 |

Detalhes em `.planning/phases/02-auth/deferred-items.md`

## Known Stubs

Nenhum. Todos os componentes têm lógica real ou delegam para `authClient` que chama a API real.

## Self-Check: PASSED

- ✅ `apps/web/app/(auth)/layout.tsx` — existe
- ✅ `apps/web/app/(auth)/login/page.tsx` — existe
- ✅ `apps/web/app/(auth)/register/page.tsx` — existe
- ✅ `apps/web/app/(auth)/forgot-password/page.tsx` — existe
- ✅ `apps/web/app/(auth)/reset-password/page.tsx` — existe
- ✅ `apps/web/app/(auth)/verify-2fa/page.tsx` — existe
- ✅ `apps/web/lib/account-lockout.ts` — existe
- ✅ `apps/web/lib/service-token.ts` — existe
- ✅ `apps/web/lib/api-client.ts` — existe
- ✅ `apps/web/middleware.ts` — existe
- ✅ `apps/api/src/plugins/auth.ts` — existe
- ✅ Commits `0ff94f0`, `ebb49b7`, `ec72095`, `fa7614d`, `1b97c54`, `fea8e54`, `a437f35`, `9a6dfe5`, `1b594a8` — todos existem

---
phase: 02-auth
plan: "03"
subsystem: auth
tags: [2fa, totp, backup-codes, bcrypt, qrcode]
dependency_graph:
  requires: [02-01]
  provides: [totp-backup-service, 2fa-api-routes, 2fa-ui-components]
  affects: [apps/web/lib, apps/web/app/api/auth, apps/web/components/auth, apps/web/app/settings]
tech_stack:
  added: [qrcode@1.5.4, bcryptjs@3.0.3, @types/qrcode, @types/bcryptjs]
  patterns: [bcrypt-cost-12, one-time-backup-codes, totp-qr-setup-flow]
key_files:
  created:
    - apps/web/lib/totp-backup.ts
    - apps/web/app/api/auth/2fa/setup/route.ts
    - apps/web/app/api/auth/2fa/verify-sensitive/route.ts
    - apps/web/components/auth/TwoFactorSetup.tsx
    - apps/web/components/auth/TwoFactorVerify.tsx
    - apps/web/app/settings/two-factor/page.tsx
    - apps/web/lib/__tests__/totp-backup.test.ts
  modified:
    - apps/web/vitest.config.ts
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "totpBackupCodes importado de app.ts (uuid + users.id) nao de auth.ts (text + user.id better-auth)"
  - "drizzle-orm adicionado como alias no vitest.config.ts apontando para packages/db/node_modules"
metrics:
  duration: "~15min"
  completed: "2026-04-29"
  tasks_completed: 7
  files_created: 7
  files_modified: 3
---

# Phase 02 Plan 03: 2FA TOTP com backup codes hasheados (bcrypt cost 12) Summary

**One-liner:** 2FA TOTP opcional com QR code setup, 8 backup codes one-time-use hasheados bcrypt cost 12, e verificacao TOTP em operacoes sensiveis.

## O que foi implementado

- **`lib/totp-backup.ts`**: Servico de backup codes — geração (8 × 10 chars hex), armazenamento hasheado (bcrypt cost 12), verificação one-time-use (marca `usedAt`), contagem restante
- **`/api/auth/2fa/setup`**: Endpoint POST que chama `auth.api.enableTwoFactor`, gera QR code base64 via `qrcode`, gera e armazena backup codes — retorna tudo ao cliente (backup codes plaintext mostrado UMA vez)
- **`/api/auth/2fa/verify-sensitive`**: Endpoint POST para verificar TOTP ou backup code antes de operações sensíveis; usuários sem 2FA passam direto
- **`TwoFactorSetup.tsx`**: Componente 3-steps: confirm senha → QR code + verify TOTP → exibir backup codes com botão copiar
- **`TwoFactorVerify.tsx`**: Componente com toggle TOTP (6 dígitos) / backup code (10 chars)
- **`/settings/two-factor/page.tsx`**: Página protegida por sessão mostrando estado atual do 2FA

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] drizzle-orm nao resolvido no vitest**
- **Found during:** Task 7 (rodar testes)
- **Issue:** `vitest` em `apps/web` não encontrava `drizzle-orm` pois o pacote só está em `packages/db/node_modules`
- **Fix:** Adicionado alias `'drizzle-orm': resolve(__dirname, '../../packages/db/node_modules/drizzle-orm')` no `vitest.config.ts`
- **Files modified:** `apps/web/vitest.config.ts`
- **Commit:** 33f7840

## Threat Model — Mitigacoes implementadas

| Threat ID | Mitigação |
|-----------|-----------|
| T-02-03-01 | TOTP verificado via better-auth (janela 30s) |
| T-02-03-02 | Backup codes: plaintext mostrado uma vez, bcrypt cost 12 armazenado |
| T-02-03-03 | verify-sensitive checa `twoFactorEnabled` antes de processar |
| T-02-03-04 | `usedAt` timestamp registrado ao consumir backup code |
| T-02-03-05 | Secret gerenciado pelo better-auth, nunca exposto pós-setup |

## Test Results

```
Test Files  6 passed (6)
Tests       16 passed (16)
```

## Self-Check: PASSED

- ✅ `apps/web/lib/totp-backup.ts` — existe
- ✅ `apps/web/app/api/auth/2fa/setup/route.ts` — existe
- ✅ `apps/web/app/api/auth/2fa/verify-sensitive/route.ts` — existe
- ✅ `apps/web/components/auth/TwoFactorSetup.tsx` — existe
- ✅ `apps/web/components/auth/TwoFactorVerify.tsx` — existe
- ✅ `apps/web/app/settings/two-factor/page.tsx` — existe
- ✅ `apps/web/lib/__tests__/totp-backup.test.ts` — existe
- ✅ Commits: 729c36d, 71615cc, 4d04397, cbda83a, 33f7840

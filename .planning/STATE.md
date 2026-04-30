# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Amigos nunca mais esquecem seu aniversario - e voce ve o de todos de forma facil, num so lugar.
**Current focus:** Phase 1 — Foundation & Infrastructure (ready to execute)

## Current Position

Phase: 7 of 7 (Security Hardening & Polish)
Plan: 3 of 3 in current phase (07-03 complete) — ALL PHASES COMPLETE
Status: Phase 7 complete — Project v1 DONE + Post-MVP Blocks B/C/D complete
Last activity: 2026-04-30 — Blocos B (Security), C (Performance), D (Observability) completos; TypeScript 3/3 zero erros

Progress: [██████████] 100% (All 7 phases complete)

## Planning Complete — Full Plan Inventory

| Phase | Plans | Files |
|-------|-------|-------|
| 1. Foundation & Infrastructure | 5 | 01-01 through 01-05 |
| 2. Authentication & Security Foundation | 4 | 02-01 through 02-04 |
| 3. User Profiles | 4 | 03-01 through 03-04 |
| 4. Social Graph | 3 | 04-01 through 04-03 |
| 5. Message Wall | 2 | 05-01 through 05-02 |
| 6. Notifications | 3 | 06-01 through 06-03 |
| 7. Security Hardening & Polish | 3 | 07-01 through 07-03 |
| **Total** | **24** | |

## Performance Metrics

**Velocity:**
- Total plans completed: 10 (04-01, 04-02, 05-01, 05-02, 06-01, 06-02, 06-03, 07-01, 07-02, 07-03)
  - Average duration: ~37 min/plan
  - Total execution time: ~370 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 04-social-graph | 2 | ~90min | ~45min |
| 05-messages | 2 | ~70min | ~35min |
| 06-notifications | 3 | ~85min | ~28min |
| 07-hardening | 3 | ~125min | ~42min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack confirmado: Next.js + Fastify v5 + PostgreSQL + Drizzle + better-auth + BullMQ + Redis + Tailwind v4
- Monorepo tool: Turborepo + pnpm (resolved)
- Auth: better-auth no BFF (Next.js), Google OAuth only in Phase 2 (Twitter/X deferred)
- 2FA: TOTP opcional; obrigatório em ops sensíveis apenas se usuário tiver ativado; 8 backup codes
- Session: access 15min + refresh 30dias; lockout 10 tentativas/15min → 30min
- Username: 3-30 chars, [a-z0-9_-], mutável (antigo → 410 Gone)
- Avatar: Cloudflare R2 + Sharp (400×400 webp)
- Privacy: public/friends/private; private → 404 para não autorizados
- Countdown: configurável (público por padrão)
- Compartilhamento: OG card dinâmico via @vercel/og
- Social: friendship bilateral, modelo Instagram para perfil privado
- Feed: 30 dias, aniversariantes do dia em destaque; SSE para in-app notifications
- Wall: configurável pelo dono (quem pode postar, anônimo, aprovação); 500 chars; sanitize-html
- Notificações: Resend email + VAPID push; 1/3/7 dias + dia; hora configurável; idempotência via notification_log
- Audit log: tabela PostgreSQL, retenção 90 dias
- Anomaly detection: regras Redis threshold (sem custo extra)
- Deploy target: NOT decided — deferred

### Pending Todos

None — all phases planned, ready to start executing Phase 1.

### Blockers/Concerns

- Deploy target not specified (Railway/Render/Fly.io) — deferred; BullMQ Worker needs a separate process
- RESEND_API_KEY required before Phase 2 email verification works — configure domain before executing Phase 2
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET required before Phase 2 OAuth works
- Cloudflare R2 bucket + credentials required before Phase 3 avatar upload works
- VAPID keys must be generated before Phase 6 push works (`npx web-push generate-vapid-keys`)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| OAuth | Twitter/X OAuth | Deferred to v2 | Phase 2 discussion |
| Deploy | Deployment target (Railway/Render/Fly.io) | Deferred | Phase 1 planning |
| Avatar | Cloudflare R2 bucket creation | Pre-Phase 3 task | Phase 3 planning |
| PWA | PWA install prompt | Post-MVP | Phase 6 discussion |

## Session Continuity

Last session: 2026-04-30
Stopped at: Blocos B, C, D completos; TypeScript zero erros; Biome zero erros; Docker, Husky, Semantic Release configurados — projeto pronto para produção
Resume file: N/A — project complete

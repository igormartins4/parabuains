# Roadmap: Parabuains

## Overview

Parabuains é construído em 7 fases que seguem a dependência natural da arquitetura: infraestrutura → auth → perfis → grafo social → mural → notificações → hardening. Cada fase entrega uma capacidade verificável e independente. As fases 1–3 são lineares e obrigatórias; a 4 e 5 têm dependência sequencial; a 6 depende da 4; a 7 finaliza o produto com auditoria de segurança e polimento.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Infrastructure** - Monorepo, banco de dados, Redis e scaffolding completo do stack
- [ ] **Phase 2: Authentication & Security Foundation** - Login seguro (email/senha + OAuth) com proteção em camadas
- [ ] **Phase 3: User Profiles** - Perfil completo, página pública `/usuario` e controles de privacidade
- [ ] **Phase 4: Social Graph** - Sistema de amizade bilateral e feed de aniversários
- [ ] **Phase 5: Message Wall** - Mural de mensagens públicas, privadas e anônimas com moderação
- [ ] **Phase 6: Notifications** - Lembretes por e-mail e push web com agendamento por timezone
- [ ] **Phase 7: Security Hardening & Polish** - Auditoria de segurança, anomaly detection e polish final

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Stack rodando end-to-end em monorepo com schema completo e infraestrutura de serviços pronta
**Depends on**: Nothing (first phase)
**Requirements**: *(infrastructure only — no v1 requirements)*
**Success Criteria** (what must be TRUE):
  1. Next.js e Fastify rodam em desenvolvimento com hot reload a partir do monorepo
  2. PostgreSQL tem schema Drizzle completo com todas as tabelas (users, friendships, wall_messages, notification_log, etc.) e migrations executando sem erros
  3. Redis e BullMQ estão conectados e o worker de notificações sobe sem erros
  4. Pipeline de CI executa lint, type-check e testes com sucesso
  5. Swagger/OpenAPI do Fastify está acessível em `/docs` no ambiente de desenvolvimento
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Monorepo root: Turborepo + pnpm workspace + turbo.json + .env.example
- [ ] 01-02-PLAN.md — Fastify v5 app: plugins (helmet/cors/rate-limit/jwt/swagger) + /health endpoint
- [ ] 01-03-PLAN.md — Drizzle schema package: all 8 DB tables + migrations
- [ ] 01-04-PLAN.md — Next.js 16 scaffold: App Router + Tailwind v4
- [ ] 01-05-PLAN.md — CI pipeline (GitHub Actions) + Vitest smoke tests

**UI hint**: no

### Phase 2: Authentication & Security Foundation
**Goal**: Usuários podem criar conta e fazer login com segurança; a camada de proteção de 5 níveis está ativa
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10
**Success Criteria** (what must be TRUE):
  1. Usuário pode criar conta com e-mail/senha e recebe e-mail de verificação
  2. Usuário pode fazer login com Google OAuth e com Twitter/X OAuth sem criar contas duplicadas para o mesmo e-mail
  3. Sessão persiste após fechar o navegador; refresh token rotation funciona corretamente
  4. Usuário pode ativar 2FA TOTP e precisa do código na próxima sessão
  5. Conta é bloqueada temporariamente após múltiplas tentativas de login falhas; rate limiting está ativo em todos os endpoints de auth
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — better-auth setup + Drizzle adapter + Resend email (verification + reset)
- [ ] 02-02-PLAN.md — Google OAuth + account linking (no duplicate emails)
- [ ] 02-03-PLAN.md — 2FA TOTP + 8 backup codes + setup UI
- [ ] 02-04-PLAN.md — Auth UI pages + honeypot + lockout + BFF service token + Fastify guard

**UI hint**: yes

### Phase 3: User Profiles
**Goal**: Cada usuário tem um perfil editável e uma página pública em `/username` com privacidade controlada
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09
**Success Criteria** (what must be TRUE):
  1. Usuário pode configurar nome, username único, foto de perfil, data de aniversário e bio; a página `/username` reflete as alterações
  2. Página pública do perfil exibe contagem regressiva para o próximo aniversário e pode ser compartilhada com um clique
  3. Perfil com privacidade "privado" retorna 404 para visitantes não autorizados (não 403)
  4. Ano de nascimento é oculto por padrão para não-amigos; amigos em comum são exibidos na página do perfil
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Profile API (Fastify): GET/PUT profile, username change, mutual friends
- [ ] 03-02-PLAN.md — Avatar upload: R2 presigned URL + Sharp processing (400×400 webp)
- [ ] 03-03-PLAN.md — Public profile page (RSC), privacy enforcement, countdown, sharing
- [ ] 03-04-PLAN.md — OG card (@vercel/og) + profile settings UI (privacy, countdown, birth year)

**UI hint**: yes

### Phase 4: Social Graph
**Goal**: Usuários podem se conectar via amizade bilateral e ver o feed de aniversários dos amigos
**Depends on**: Phase 3
**Requirements**: SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, SOCL-06, SOCL-07, SOCL-08
**Success Criteria** (what must be TRUE):
  1. Usuário pode buscar outros usuários, enviar pedido de amizade, e o destinatário pode aceitar ou recusar
  2. Usuário pode remover amigo e gerenciar sua lista de amigos
  3. Feed exibe aniversários dos amigos nos próximos 30 dias; aniversariantes do dia aparecem destacados no topo
  4. Sistema sugere amigos de amigos como possíveis conexões
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Friendship API: send/accept/reject/block/remove + user search + suggestions
- [ ] 04-02-PLAN.md — Birthday feed (30 days, timezone-aware) + SSE in-app notifications + BullMQ stubs
- [ ] 04-03-PLAN.md — Social UI: feed page, friends list, requests inbox, search, profile integration

**UI hint**: yes

### Phase 5: Message Wall
**Goal**: Visitantes podem deixar mensagens no mural do aniversariante; o aniversariante pode moderar
**Depends on**: Phase 4
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, MSG-06, MSG-07
**Success Criteria** (what must be TRUE):
  1. Usuário autenticado pode escrever mensagem pública, privada ou anônima no mural de um amigo; o remetente escolhe o tipo ao enviar
  2. Aniversariante vê mensagens privadas; mensagens anônimas ocultam o remetente para o destinatário (mas o servidor registra para moderação)
  3. Aniversariante pode apagar mensagens do seu próprio mural; qualquer usuário pode reportar mensagem inadequada
  4. Mensagens passam por sanitização de HTML/XSS antes de serem salvas; nenhum conteúdo não-sanitizado é renderizado
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Wall Messages API: migration, MessageService (sanitize-html, anonymous, approval, reports), BullMQ enqueue
- [ ] 05-02-PLAN.md — Wall UI: compose modal, wall section on profile, settings (who can post, anonymous, approval), pending inbox

**UI hint**: yes

### Phase 6: Notifications
**Goal**: Usuários recebem lembretes de aniversário de amigos por e-mail e push web, respeitando timezone e preferências
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07, NOTF-08
**Success Criteria** (what must be TRUE):
  1. Usuário recebe e-mail de lembrete antes do aniversário de um amigo (1, 3 ou 7 dias, conforme configurado) e no próprio dia
  2. Usuário pode habilitar push web com fluxo de dupla confirmação (modal in-app antes do prompt do navegador); push chega no horário correto para o timezone do usuário
  3. Usuário recebe notificação quando alguém escreve no seu mural e quando pedido de amizade é aceito
  4. Usuário pode configurar preferências de notificação por canal (e-mail/push) e por tipo de evento; preferências são respeitadas pelo worker
  5. Notificações são idempotentes: o mesmo lembrete não é enviado duas vezes no mesmo ano para o mesmo par (destinatário, aniversariante)
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Email notifications: Resend transport + React Email templates + BullMQ consumers + preferences API
- [ ] 06-02-PLAN.md — Web Push: VAPID transport + service worker + push subscribe API + double-confirm UX
- [ ] 06-03-PLAN.md — Birthday scheduler: BullMQ daily cron (timezone-aware delay) + notification preferences settings UI

**UI hint**: yes

### Phase 7: Security Hardening & Polish
**Goal**: O sistema passa por auditoria completa de segurança; audit logs, anomaly detection e polimento final estão operacionais
**Depends on**: Phase 6
**Requirements**: *(cross-cutting security concerns from all phases — no new v1 requirements)*
**Success Criteria** (what must be TRUE):
  1. Audit log registra todas as ações sensíveis (login, mudança de e-mail, deleção de conta, 2FA toggle) com actor, IP e timestamp
  2. Rate limiting está configurado e testado em todos os endpoints de mutação (não apenas login): forgot-password, friendship request, wall message post
  3. 2FA é obrigatório em operações sensíveis (troca de e-mail, desabilitar 2FA, deletar conta); códigos de recuperação de 2FA são gerados, hasheados e funcionam
  4. Anomaly detection detecta e sinaliza: volume anormal de mensagens, taxa de pedidos de amizade, tentativas de login suspeitas
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — Audit log: Fastify onSend hook, AuditRepository, 12 sensitive routes, 90-day cleanup job
- [ ] 07-02-PLAN.md — Anomaly detection (Redis thresholds) + 2FA enforcement on sensitive ops + rate limiting audit
- [ ] 07-03-PLAN.md — CSP tightening + loading skeletons + error boundaries + a11y + final test suite + launch checklist

**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 0/5 | Not started | - |
| 2. Authentication & Security Foundation | 0/4 | Not started | - |
| 3. User Profiles | 0/4 | Not started | - |
| 4. Social Graph | 0/3 | Not started | - |
| 5. Message Wall | 0/2 | Not started | - |
| 6. Notifications | 0/3 | Not started | - |
| 7. Security Hardening & Polish | 0/3 | Not started | - |

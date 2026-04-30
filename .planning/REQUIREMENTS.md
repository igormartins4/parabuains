# Requirements: Parabuains

**Defined:** 2026-04-29
**Core Value:** Amigos nunca mais esquecem seu aniversario - e voce ve o de todos de forma facil, num so lugar.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Usuario pode criar conta com e-mail e senha
- [x] **AUTH-02**: Usuario recebe e-mail de verificacao apos cadastro
- [x] **AUTH-03**: Usuario pode fazer login com Google OAuth
- [ ] **AUTH-04**: Usuario pode fazer login com Twitter/X OAuth *(Deferred to v2)*
- [x] **AUTH-05**: Usuario pode redefinir senha via link por e-mail
- [x] **AUTH-06**: Sessao persiste apos fechar o navegador (refresh token)
- [x] **AUTH-07**: Usuario pode ativar autenticacao de dois fatores (2FA TOTP)
- [x] **AUTH-08**: Conta e bloqueada temporariamente apos multiplas tentativas de login falhas
- [x] **AUTH-09**: Tokens JWT com refresh rotation e expiracao configuravel
- [x] **AUTH-10**: Login unificado - OAuth e e-mail/senha nao criam contas duplicadas para o mesmo e-mail

### Profile

- [x] **PROF-01**: Usuario pode definir nome de exibicao e username unico (usado na URL /usuario)
- [x] **PROF-02**: Usuario pode fazer upload de foto de perfil (avatar)
- [x] **PROF-03**: Usuario pode definir data de aniversario (dia e mes obrigatorios; ano opcional)
- [x] **PROF-04**: Usuario pode escrever uma bio/descricao curta (max 300 chars)
- [x] **PROF-05**: Usuario pode configurar privacidade do perfil (publico / so amigos / privado)
- [x] **PROF-06**: Pagina do perfil exibe contagem regressiva para o proximo aniversario
- [x] **PROF-07**: Usuario pode compartilhar link do perfil com um clique (copiar URL)
- [x] **PROF-08**: Perfil exibe lista de amigos em comum com o visitante
- [x] **PROF-09**: Ano de nascimento e oculto por padrao para nao-amigos (privacidade LGPD)

### Social

- [x] **SOCL-01**: Usuario pode enviar pedido de amizade para outro usuario
- [x] **SOCL-02**: Usuario pode aceitar ou recusar pedido de amizade recebido
- [x] **SOCL-03**: Usuario pode remover um amigo existente
- [x] **SOCL-04**: Usuario pode visualizar e gerenciar sua lista de amigos
- [x] **SOCL-05**: Usuario pode buscar outros usuarios por nome ou username
- [x] **SOCL-06**: Usuario ve feed de aniversarios proximos (proximo 30 dias) de seus amigos
- [x] **SOCL-07**: Aniversariantes do dia sao destacados no topo do feed
- [x] **SOCL-08**: Sistema sugere possiveis amizades (amigos de amigos)

### Messages

- [x] **MSG-01**: Usuario autenticado pode escrever mensagem publica no mural de um amigo
- [x] **MSG-02**: Usuario autenticado pode enviar mensagem privada (visivel apenas ao aniversariante)
- [x] **MSG-03**: Usuario autenticado pode enviar mensagem anonima (remetente oculto para o destinatario, mas registrado no servidor para moderacao)
- [x] **MSG-04**: Remetente escolhe o tipo da mensagem ao enviar (publica / privada / anonima)
- [x] **MSG-05**: Aniversariante pode apagar mensagens do seu proprio mural
- [x] **MSG-06**: Usuario pode reportar mensagem inadequada
- [x] **MSG-07**: Mensagens passam por sanitizacao de HTML/XSS antes de serem salvas

### Notifications

- [x] **NOTF-01**: Usuario recebe lembrete por e-mail antes do aniversario de amigo (antecedencia configuravel)
- [x] **NOTF-02**: Usuario recebe notificacao push web antes do aniversario de amigo
- [x] **NOTF-03**: Usuario recebe lembrete no proprio dia do aniversario do amigo (e-mail + push)
- [x] **NOTF-04**: Usuario pode configurar antecedencia dos lembretes (1, 3, 7 dias)
- [x] **NOTF-05**: Usuario recebe notificacao quando alguem escreve no seu mural
- [x] **NOTF-06**: Usuario recebe notificacao quando pedido de amizade e aceito
- [x] **NOTF-07**: Usuario pode configurar preferencias de notificacao por canal e tipo de evento
- [x] **NOTF-08**: Notificacoes de aniversario sao agendadas considerando o timezone do usuario

## v2 Requirements

### Social Extras

- **SOCL-V2-01**: Reacoes/curtidas em mensagens do mural
- **SOCL-V2-02**: Ranking de aniversarios do dia na plataforma

### Notifications Extras

- **NOTF-V2-01**: Integracao com WhatsApp (via API oficial Meta)
- **NOTF-V2-02**: Integracao com Google Calendar / Apple Calendar

### Profile Extras

- **PROF-V2-01**: Temas personalizados para pagina de aniversario
- **PROF-V2-02**: Lista de desejos (wishlist) no perfil para sugestoes de presente

### Monetization

- **MON-V2-01**: Plano premium com temas exclusivos e perfil sem anuncios
- **MON-V2-02**: Sugestoes de presentes com links afiliados no dia do aniversario
- **MON-V2-03**: Plano para grupos/empresas (aniversarios de equipes)

## Out of Scope

| Feature | Reason |
|---------|--------|
| App mobile nativo (iOS/Android) | Web mobile-first suficiente para v1; custo alto de manutencao |
| WhatsApp notifications | API paga, processo de aprovacao Meta complexo; v2 |
| Integracoes de calendario | Desejavel mas nao essencial para v1 |
| Reacoes/curtidas em mensagens | Feature de engajamento; v2 apos validar produto base |
| Temas personalizados | Diferenciador para monetizacao; v2 |
| Conteudo em video ou GIFs animados no mural | Complexidade de armazenamento/moderacao; v2 |
| Chat em tempo real | Alta complexidade (WebSockets), nao e o core da proposta |
| IA para gerar mensagens automaticas | Anti-feature: reduz autenticidade das mensagens |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-02 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-03 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-04 | Phase 2 — Authentication & Security Foundation | Deferred to v2 |
| AUTH-05 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-06 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-07 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-08 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-09 | Phase 2 — Authentication & Security Foundation | Complete |
| AUTH-10 | Phase 2 — Authentication & Security Foundation | Complete |
| PROF-01 | Phase 3 — User Profiles | Complete |
| PROF-02 | Phase 3 — User Profiles | Complete |
| PROF-03 | Phase 3 — User Profiles | Complete |
| PROF-04 | Phase 3 — User Profiles | Complete |
| PROF-05 | Phase 3 — User Profiles | Complete |
| PROF-06 | Phase 3 — User Profiles | Complete |
| PROF-07 | Phase 3 — User Profiles | Complete |
| PROF-08 | Phase 3 — User Profiles | Complete |
| PROF-09 | Phase 3 — User Profiles | Complete |
| SOCL-01 | Phase 4 — Social Graph | Complete |
| SOCL-02 | Phase 4 — Social Graph | Complete |
| SOCL-03 | Phase 4 — Social Graph | Complete |
| SOCL-04 | Phase 4 — Social Graph | Complete |
| SOCL-05 | Phase 4 — Social Graph | Complete |
| SOCL-06 | Phase 4 — Social Graph | Complete |
| SOCL-07 | Phase 4 — Social Graph | Complete |
| SOCL-08 | Phase 4 — Social Graph | Complete |
| MSG-01 | Phase 5 — Message Wall | Complete |
| MSG-02 | Phase 5 — Message Wall | Complete |
| MSG-03 | Phase 5 — Message Wall | Complete |
| MSG-04 | Phase 5 — Message Wall | Complete |
| MSG-05 | Phase 5 — Message Wall | Complete |
| MSG-06 | Phase 5 — Message Wall | Complete |
| MSG-07 | Phase 5 — Message Wall | Complete |
| NOTF-01 | Phase 6 — Notifications | Complete |
| NOTF-02 | Phase 6 — Notifications | Complete |
| NOTF-03 | Phase 6 — Notifications | Complete |
| NOTF-04 | Phase 6 — Notifications | Complete |
| NOTF-05 | Phase 6 — Notifications | Complete |
| NOTF-06 | Phase 6 — Notifications | Complete |
| NOTF-07 | Phase 6 — Notifications | Complete |
| NOTF-08 | Phase 6 — Notifications | Complete |

> **Note:** Phase 1 (Foundation & Infrastructure) and Phase 7 (Security Hardening & Polish) cover no specific REQUIREMENTS.md entries — Phase 1 is infrastructure-only; Phase 7 audits cross-cutting security concerns from all prior phases.

**Coverage:**
- v1 requirements: 42 total
- Implemented: 41/42 ✓
- Deferred to v2: 1 (AUTH-04 — Twitter/X OAuth)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-29*
*Last updated: 2026-04-30 — all v1 requirements complete except AUTH-04 (Twitter/X deferred)*

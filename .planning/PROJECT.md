# Parabuains

## What This Is

Parabuains e uma plataforma web social focada em aniversarios. Usuarios criam um perfil com sua data de aniversario e compartilham uma pagina publica personalizada (parabuains.com/usuario) com amigos e familiares. A plataforma facilita lembretes automaticos, mensagens de parabens e interacoes genuinas no dia especial, sem a complexidade de redes sociais tradicionais.

## Core Value

Amigos nunca mais esquecem seu aniversario - e voce ve o de todos de forma facil, num so lugar.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Usuario pode criar conta com e-mail/senha ou OAuth (Google, Twitter/X)
- [ ] Usuario pode configurar perfil: nome, foto, data de aniversario, descricao opcional
- [ ] Cada usuario tem uma pagina publica em /usuario compartilhavel
- [ ] Sistema de amizade bilateral (adicionar, aceitar, remover)
- [ ] Controle de privacidade por perfil (publico, so amigos, privado)
- [ ] Feed de aniversarios proximos dos amigos
- [ ] Contagem regressiva para o proximo aniversario na pagina do perfil
- [ ] Mural de mensagens publicas de parabens na pagina do aniversariante
- [ ] Mensagens privadas ou anonimas para o aniversariante
- [ ] Notificacoes por e-mail antes do aniversario de amigos
- [ ] Notificacoes push web antes do aniversario de amigos

### Out of Scope

- Integracao com WhatsApp - API paga e complexidade de aprovacao Meta; considerar em v2
- Integracao com Google/Apple Calendar - desejavel mas nao essencial para v1
- Temas personalizados de perfil - diferenciador para v2/monetizacao
- Ranking/destaque de aniversarios do dia - feature de engajamento para v2
- App mobile nativo - web mobile-first e suficiente para v1
- Reacoes/curtidas em mensagens - v2

## Context

- Desenvolvedor frontend com experiencia em React; familiaridade com Next.js e Tailwind
- Stack escolhida: Next.js (frontend + BFF) + API backend separada (Fastify ou NestJS) + PostgreSQL + Tailwind CSS
- Foco em mobile-first; cores alegres associadas a celebracao (amarelo, laranja, roxo)
- Seguranca e requisito nao-negociavel: rate limiting, input sanitization, HTTPS, headers seguros, 2FA, audit logs, deteccao de anomalias
- Arquitetura orientada a design patterns e boas praticas (Clean Architecture, Repository Pattern, etc.)
- Monetizacao futura em aberto: perfil premium, anuncios contextuais (sugestao de presentes), planos para grupos

## Constraints

- **Stack**: Next.js + API separada (Fastify/NestJS) + PostgreSQL + Tailwind CSS - definido pelo desenvolvedor
- **Auth**: OAuth obrigatorio (Google, Twitter/X) + e-mail/senha - nao negociavel para UX
- **Seguranca**: Implementacao completa em camadas desde o inicio - rate limiting, sanitizacao, 2FA, audit logs, deteccao de anomalias
- **Design**: Mobile-first, paleta celebrativa (amarelo, laranja, roxo), interface limpa e moderna
- **Notificacoes v1**: E-mail + push web apenas (WhatsApp e v2)
- **Arquitetura**: Design patterns e boas praticas como base - nao e opcional, e estrutural

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| API backend separada do Next.js | Mais controle sobre performance, escalabilidade e seguranca do backend | - Pending |
| Sistema de amizade bilateral (nao "seguir") | Garante privacidade mutua e mais adequado ao contexto intimo de aniversarios | - Pending |
| E-mail + push web para notificacoes v1 | Evita dependencia de APIs pagas (WhatsApp); cobre o caso de uso principal | - Pending |
| Seguranca em camadas desde o inicio | Custo de corrigir seguranca retroativamente e muito alto | - Pending |
| Monetizacao adiada para v2 | Nao comprometer UX do v1 com features de monetizacao antes de validar produto | - Pending |

## Evolution

Este documento evolui a cada transicao de fase e marco.

**Apos cada transicao de fase** (via /gsd-transition):
1. Requirements invalidados? -> Mover para Out of Scope com motivo
2. Requirements validados? -> Mover para Validated com referencia de fase
3. Novos requirements? -> Adicionar em Active
4. Decisoes a registrar? -> Adicionar em Key Decisions
5. "What This Is" ainda preciso? -> Atualizar se drifted

**Apos cada milestone** (via /gsd-complete-milestone):
1. Revisao completa de todas as secoes
2. Core Value check - ainda e a prioridade certa?
3. Auditoria do Out of Scope - motivos ainda validos?
4. Atualizar Context com estado atual

---
*Last updated: 2026-04-29 after initialization*

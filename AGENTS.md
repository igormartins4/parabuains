# AGENTS.md — Parabuains

## Project Overview

Parabuains e uma plataforma web social focada em aniversarios. Stack: Next.js (frontend/BFF) + Fastify v5 (API separada) + PostgreSQL + Drizzle ORM + better-auth + BullMQ + Redis + Tailwind v4.

## GSD Workflow

Este projeto usa o workflow GSD (Get Shit Done). Consulte `.planning/` para contexto completo.

- `.planning/PROJECT.md` — contexto e decisoes do projeto
- `.planning/REQUIREMENTS.md` — 42 requirements v1 com IDs rastreáveis
- `.planning/ROADMAP.md` — 7 fases com criterios de sucesso
- `.planning/STATE.md` — estado atual do projeto
- `.planning/config.json` — configuracao do workflow (YOLO, standard granularity, parallel)
- `.planning/research/` — pesquisa de dominio (stack, features, arquitetura, pitfalls)

## Architecture

- **Frontend**: Next.js (App Router) + Tailwind v4 + BFF pattern (NAO acessa PostgreSQL diretamente)
- **Backend**: Fastify v5 separado com Clean Architecture (Repository + Service Layer)
- **Database**: PostgreSQL com Drizzle ORM
- **Auth**: better-auth (OAuth Google/Twitter + email/senha + 2FA TOTP)
- **Jobs**: BullMQ + Redis para notificacoes agendadas
- **Security**: 5 camadas — Edge, Next.js Middleware, Auth, BFF Proxy, Fastify API

## Key Constraints

- Ano de nascimento oculto por padrao para nao-amigos (privacidade)
- Mensagens anonimas: ocultar remetente para destinatario, registrar no servidor para moderacao
- Notificacoes devem considerar timezone do usuario (IANA timezone)
- Idempotencia em notificacoes: mesmo lembrete nao enviado duas vezes no mesmo ano
- Perfis privados retornam 404 (nao 403) para nao autorizados
- OAuth + email/senha NAO criam contas duplicadas para o mesmo e-mail

## Current Phase

Nao iniciado — execute `/gsd-discuss-phase 1` para comecar.

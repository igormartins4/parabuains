# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Architecture Guardrails (Highest Priority)
1. **[2026-04-29] Next.js nunca acessa PostgreSQL diretamente**
   Do instead: sempre usar Fastify API via BFF proxy com service JWT (60s expiry).

2. **[2026-04-29] Perfis privados retornam 404, nao 403**
   Do instead: no middleware de perfil, retornar 404 para nao autorizados para nao confirmar existencia da conta.

3. **[2026-04-29] Mensagens anonimas sao anonimas so para o destinatario**
   Do instead: salvar sender_id no servidor sempre; apenas omitir na exibicao para o destinatario.

4. **[2026-04-29] OAuth + email/senha nao criam contas duplicadas**
   Do instead: checar e-mail existente antes de criar conta OAuth; unificar por e-mail com confirmacao.

## Notification Pitfalls
1. **[2026-04-29] Notificacoes de aniversario devem usar timezone IANA do usuario**
   Do instead: armazenar IANA timezone no perfil; agendar BullMQ job no horario local do usuario, nao UTC.

2. **[2026-04-29] Idempotencia em notificacoes: nao enviar o mesmo lembrete duas vezes**
   Do instead: unique constraint em notification_log (recipient, subject, channel, reminder_type, year).

3. **[2026-04-29] Push permission nao pode ser pedida cedo demais — bloqueio permanente**
   Do instead: double-permission pattern — mostrar modal in-app primeiro; so chamar requestPermission() se usuario aceitar.

## Stack Notes
1. **[2026-04-29] Tailwind v4 e breaking change — sem tailwind.config.js**
   Do instead: configurar via @theme em CSS; nao usar sintaxe v3.

2. **[2026-04-29] Write files use PowerShell Set-Content, nao Write tool (permissao negada)**
   Do instead: usar Set-Content -Path "..." -Value $content -Encoding UTF8 via Bash.

## User Directives
1. **[2026-04-29] Responder sempre em portugues**
   Do instead: todas as respostas em pt-BR.

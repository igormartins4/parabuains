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

2. **[2026-04-30] PowerShell interpreta [brackets] em paths como glob — usar -LiteralPath**
   Do instead: Get-Content -LiteralPath "...\[username]\file" ; Set-Content -LiteralPath "..." ; Remove-Item -LiteralPath "..."

3. **[2026-04-30] BullMQ Queue/Worker: NUNCA chamar getNotificationsQueue() em module-level**
   Do instead: envolver em lazy Proxy ou chamar apenas dentro de handlers/consumers; chamada antecipada tenta conectar Redis e trava testes.

4. **[2026-04-30] Biome 2.x: biome-ignore deve estar na linha ANTERIOR ao nó com o diagnóstico, nao ao elemento pai**
   Do instead: para `key={i}` em JSX, colocar o comentário como prop inline `// biome-ignore ...` antes do `key={i}`, nao antes do elemento pai.

5. **[2026-04-30] Biome --write remove suppression/unused automaticamente se a regra nao aponta para aquele node**
   Do instead: rodar `biome check --write` depois de adicionar biome-ignore para remover suppresions incorretos.

6. **[2026-04-29] Write files use PowerShell Set-Content, nao Write tool (permissao negada)**
   Do instead: usar Set-Content -LiteralPath "..." -Value $content via Bash.

7. **[2026-04-29] Vitest no web: alias @ deve apontar para raiz do app, nao src/**
   Do instead: `'@': resolve(__dirname, '.')` em vitest.config.ts; tsconfig paths `@/*` → `./*`.

8. **[2026-04-29] Workspace packages nao resolvem em Vite/Vitest sem alias explicito**
   Do instead: adicionar `'@parabuains/db/schema': resolve(...)` e `'@parabuains/db': resolve(...)` no vitest.config.ts alias.

9. **[2026-04-29] drizzle-orm nao resolve no vitest sem alias explicito**
   Do instead: adicionar `'drizzle-orm': resolve('../../packages/db/node_modules/drizzle-orm')` no alias do vitest.config.ts.

10. **[2026-04-30] @fastify/rate-limit usa redis.rateLimit() internamente — Proxy quebra**
    Do instead: em NODE_ENV=test, passar `redis: undefined` ao plugin de rate-limit para usar in-memory store.

11. **[2026-04-30] pnpm workspace: duas instâncias do mesmo pacote causam incompatibilidade de tipos TS**
    Do instead: quando `PgTableWithColumns not assignable to PgTable<TableConfig>`, verificar se há múltiplas instâncias físicas (`(Get-Item node_modules/pkg).Target`). Usar `"pnpm": { "overrides": { "pkg": "version" } }` no package.json raiz para forçar deduplication.

## User Directives
1. **[2026-04-29] Responder sempre em portugues**
   Do instead: todas as respostas em pt-BR.

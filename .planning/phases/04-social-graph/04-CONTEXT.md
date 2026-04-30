# Phase 4: Social Graph — Context

**Gathered:** 2026-04-30
**Status:** Ready for planning
**Source:** ROADMAP.md, REQUIREMENTS.md, AGENTS.md, DB schema (app.ts)

<domain>
## Phase Boundary

Phase 4 entrega o grafo social completo: sistema de amizades bilateral, busca de usuários, sugestões de amizade, e feed de aniversários dos amigos.

- Friendship API (Fastify): enviar/aceitar/recusar/remover pedidos; listar amigos e pedidos pendentes
- User search: busca por nome ou username com resultado paginado
- Suggestions: amigos de amigos como conexões sugeridas
- Birthday feed: aniversários dos amigos nos próximos 30 dias, timezone-aware
- In-app notifications via SSE (Server-Sent Events): pedido recebido, pedido aceito
- BullMQ stubs para notificações de amizade que serão consumidas na Fase 6
- Social UI: página de feed, lista de amigos, inbox de pedidos, integração no perfil

**NOT in Phase 4:**
- Wall messages (Phase 5)
- Email/push notifications (Phase 6 — apenas stubs BullMQ aqui)
- Moderação, reports (Phase 5/7)
- Qualquer feature de chat em tempo real

</domain>

<decisions>
## Implementation Decisions

### D-01: Friendship Model
A tabela `friendships` já existe no schema (app.ts) com:
- `requester_id`, `addressee_id`, `status` ('pending' | 'accepted' | 'blocked')
- Unique constraint `(requester_id, addressee_id)` — apenas uma linha por par (direção importa)
- Check constraint: `requester_id != addressee_id`
- Índices: `(addressee_id, status)` e `(requester_id, status)`

### D-02: Friendship Status Transitions
```
(nenhuma) → pending   [requester envia pedido]
pending   → accepted  [addressee aceita]
pending   → (deletar) [addressee recusa — não manter registro]
accepted  → (deletar) [qualquer lado remove amigo]
qualquer  → blocked   [bloqueio — fase futura, não implementar em v1]
```
Em v1: sem `blocked`. Recusa = DELETE da linha. Remoção de amigo = DELETE da linha.

### D-03: Friendship API Endpoints (Fastify)
```
POST   /v1/friendships                        → enviar pedido (cria pending)
GET    /v1/friendships/pending                → listar pedidos recebidos (addressee = me)
GET    /v1/friendships/sent                   → listar pedidos enviados (requester = me)
POST   /v1/friendships/:id/accept             → aceitar pedido (addressee = me, status → accepted)
DELETE /v1/friendships/:id                    → recusar ou remover (DELETE da linha)
GET    /v1/friendships                        → listar amigos aceitos do usuário autenticado
GET    /v1/users/search?q=&limit=&cursor=     → busca de usuários (nome/username)
GET    /v1/friendships/suggestions            → sugestões (amigos de amigos)
GET    /v1/feed/birthdays                     → feed de aniversários (próximos 30 dias)
GET    /v1/friendships/status/:targetUserId   → status de amizade entre me e targetUser
```

### D-04: User Search
- Query: `q` (string, mín 2 chars), `limit` (padrão 20, max 50), `cursor` (UUID, paginação por keyset)
- Busca case-insensitive em `LOWER(username)` e `LOWER(display_name)` via `ILIKE`
- Perfis privados: aparecem na busca (username + display_name apenas), sem bio/birthday
- Resposta inclui `friendshipStatus` para cada resultado: `none | pending_sent | pending_received | accepted`

### D-05: Friend Suggestions
- Algoritmo: amigos de amigos que ainda não são amigos do usuário
- Limite: 10 sugestões por chamada
- Ordenar por: número de amigos em comum (descendente)
- Excluir: o próprio usuário, amigos já aceitos, pedidos pendentes em qualquer direção

### D-06: Birthday Feed
- Janela: próximos 30 dias a partir de `now()` no timezone do usuário autenticado
- Aniversariantes do dia: `day_of_year(birthday) = day_of_year(today)` no timezone do usuário → destacar no topo
- Algoritmo timezone-aware: calcular "próximo aniversário" com Luxon no BFF, não no PostgreSQL
- Estrutura da resposta:
  ```typescript
  {
    today: BirthdayEntry[]      // aniversariantes do dia
    upcoming: BirthdayEntry[]   // próximos 30 dias (excl. hoje), ordenados por dias faltando
  }
  ```
- `BirthdayEntry`: `{ userId, username, displayName, avatarUrl, nextBirthday: string, daysUntil: number }`
- Birth year: aplicar regra PROF-09 — omitir ano se `birthYearHidden = true` e viewer não é amigo (no feed, todos são amigos)
  - No feed: todos os mostrados são amigos → exibir ano se `birthYearHidden = false`

### D-07: SSE In-App Notifications
- Endpoint: `GET /v1/notifications/stream` (Fastify SSE)
- Eventos emitidos:
  - `friendship_request` — quando alguém envia pedido ao usuário conectado
  - `friendship_accepted` — quando pedido do usuário é aceito
- Implementação: Redis Pub/Sub — Fastify publica no canal `user:{userId}:events`; o endpoint SSE subscreve
- Conexão: `text/event-stream`, sem polling. Cliente reconecta automaticamente.
- Auth: requer JWT válido (query param `?token=` ou header Authorization)
- Timeout: fechar conexão depois de 5 minutos de inatividade (heartbeat a cada 30s)

### D-08: BullMQ Stubs para Fase 6
- Quando pedido é aceito: enqueue job `friendship_accepted` na fila `notifications`
  ```typescript
  notificationsQueue.add('friendship_accepted', {
    type: 'friendship_accepted',
    recipientId: requesterId,   // quem enviou o pedido
    actorId: addresseeId,       // quem aceitou
  });
  ```
- Workers reais serão implementados na Fase 6. Nesta fase: apenas enqueue, sem consumer.

### D-09: FriendshipRepository Pattern
Seguir o mesmo padrão de UserRepository da Fase 3:
- `FriendshipRepository`: acesso a dados via Drizzle ORM
- `FriendshipService`: lógica de negócio (validações, status transitions)
- `FeedRepository`: queries específicas do feed
- `FeedService`: lógica timezone-aware do feed

### D-10: Social UI Pages (Next.js)
```
apps/web/app/feed/page.tsx              ← feed de aniversários (RSC + client islands)
apps/web/app/friends/page.tsx           ← lista de amigos + pendentes + busca
apps/web/app/(profile)/[username]/      ← integração: botão Add Friend, status, mutual friends
```
- Feed page: RSC com Client Component para SSE notifications badge
- Friends page: busca com debounce 300ms, infinite scroll via Intersection Observer
- Profile page: mostrar botão "Adicionar amigo" / "Pedido enviado" / "Amigos" baseado no `friendshipStatus`

### the Agent's Discretion
- Layout exato do feed (card design, avatar size)
- Skeleton loaders e estados de carregamento
- Animações de transição ao aceitar/recusar pedido
- Número exato de amigos exibidos em "mutual friends" na busca (sugestão: até 3)

</decisions>

<canonical_refs>
## Canonical References

- `packages/db/src/schema/app.ts` — tabela `friendships` (requester_id, addressee_id, status)
- `.planning/phases/03-profiles/03-CONTEXT.md` — privacidade de perfil, birth year hiding
- `.planning/research/ARCHITECTURE.md` — BFF pattern, service token, camadas de segurança
- `.planning/research/STACK.md` — BullMQ, Redis Pub/Sub, luxon, SSE
- `.planning/ROADMAP.md` — Phase 4 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

### FriendshipRepository (Drizzle)
```typescript
// Verificar se pedido já existe em qualquer direção
async findBetween(userAId: string, userBId: string) {
  return db.select().from(friendships).where(
    or(
      and(eq(friendships.requesterId, userAId), eq(friendships.addresseeId, userBId)),
      and(eq(friendships.requesterId, userBId), eq(friendships.addresseeId, userAId)),
    )
  ).limit(1);
}
```

### Feed Query Pattern (BFF com Luxon)
```typescript
// apps/web — calcular próximo aniversário em timezone do usuário
import { DateTime } from 'luxon';

function getNextBirthday(birthDate: string, timezone: string): DateTime {
  const now = DateTime.now().setZone(timezone);
  const [month, day] = birthDate.split('-').map(Number); // MM-DD
  let next = DateTime.fromObject({ year: now.year, month, day }, { zone: timezone });
  if (next < now) next = next.plus({ years: 1 });
  return next;
}
```

### SSE Heartbeat Pattern (Fastify)
```typescript
fastify.get('/v1/notifications/stream', { onRequest: [fastify.authenticate] }, async (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const sub = await redis.subscribe(`user:${req.user.id}:events`, (message) => {
    reply.raw.write(`data: ${message}\n\n`);
  });

  const heartbeat = setInterval(() => {
    reply.raw.write(': heartbeat\n\n');
  }, 30_000);

  req.socket.on('close', () => {
    clearInterval(heartbeat);
    redis.unsubscribe(`user:${req.user.id}:events`);
  });
});
```

### Friendship Status Helper (BFF)
```typescript
type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

// Chamado pelo BFF ao renderizar página de perfil
async function getFriendshipStatus(viewerId: string, targetId: string): Promise<FriendshipStatus> {
  const res = await apiFetch(`/v1/friendships/status/${targetId}`);
  return res.status;
}
```

</specifics>

<deferred>
## Deferred Items

- `blocked` status na tabela friendships (v2 — sem UI ou lógica em v1)
- Paginação do feed além de 30 dias (v2)
- "Pessoas que você talvez conheça" baseado em contatos telefônicos (out of scope)
- Contagem de visualizações de perfil (out of scope v1)

</deferred>

---

*Phase: 04-social-graph*
*Context gathered: 2026-04-30*

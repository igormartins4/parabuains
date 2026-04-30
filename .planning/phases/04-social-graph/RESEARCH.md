# Phase 4: Social Graph — Research

**Gathered:** 2026-04-30
**Phase:** 04-social-graph
**Requirements covered:** SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, SOCL-06, SOCL-07, SOCL-08

---

## 1. DB Schema Analysis

A tabela `friendships` já existe em `packages/db/src/schema/app.ts`:

```typescript
export const friendships = pgTable('friendships', {
  id: uuid('id').defaultRandom().primaryKey(),
  requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: uuid('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_friendships_addressee').on(table.addresseeId, table.status),
  index('idx_friendships_requester').on(table.requesterId, table.status),
  uniqueIndex('friendships_requester_addressee_key').on(table.requesterId, table.addresseeId),
  check('friendships_status_check', sql`${table.status} IN ('pending', 'accepted', 'blocked')`),
  check('friendships_no_self_friend', sql`${table.requesterId} != ${table.addresseeId}`),
]);
```

**Observações críticas:**
- O unique constraint é **direcional**: `(requester_id, addressee_id)`. Se Alice enviou pedido para Bob, a linha é `(alice, bob)`. Bob não pode enviar pedido para Alice enquanto já existe `(alice, bob)`.
- Para verificar amizade em qualquer direção, toda query precisa checar `(A, B) OR (B, A)`.
- `blocked` existe no schema mas não será usado em v1 — apenas `pending` e `accepted`.
- Recusa = DELETE, Remoção de amigo = DELETE (não manter histórico em v1).

**Índices existentes:**
- `(addressee_id, status)` — otimiza "pedidos recebidos" e "amigos de X"
- `(requester_id, status)` — otimiza "pedidos enviados" e "amigos de X"

---

## 2. Padrão de Amizade Bilateral

Como a tabela usa o modelo **requester/addressee direcional** (não bidirecional), toda query de "amigos aceitos de X" deve usar OR:

```sql
SELECT * FROM friendships
WHERE status = 'accepted'
  AND (requester_id = $userId OR addressee_id = $userId)
```

Para obter o "outro lado" da amizade:
```sql
CASE WHEN requester_id = $userId THEN addressee_id ELSE requester_id END AS friend_id
```

**Drizzle equivalente:**
```typescript
const friendIds = db
  .select({
    friendId: sql<string>`CASE WHEN ${friendships.requesterId} = ${userId}
                               THEN ${friendships.addresseeId}
                               ELSE ${friendships.requesterId} END`
  })
  .from(friendships)
  .where(
    and(
      eq(friendships.status, 'accepted'),
      or(
        eq(friendships.requesterId, userId),
        eq(friendships.addresseeId, userId),
      )
    )
  );
```

---

## 3. Algoritmo de Sugestões (Amigos de Amigos)

### Abordagem SQL recursiva simples:
```sql
-- Amigos diretos de $userId
WITH my_friends AS (
  SELECT CASE WHEN requester_id = $userId THEN addressee_id ELSE requester_id END AS friend_id
  FROM friendships
  WHERE status = 'accepted'
    AND (requester_id = $userId OR addressee_id = $userId)
),
-- Amigos dos meus amigos
friends_of_friends AS (
  SELECT
    CASE WHEN f.requester_id = mf.friend_id THEN f.addressee_id ELSE f.requester_id END AS suggested_id,
    COUNT(*) AS mutual_count
  FROM friendships f
  JOIN my_friends mf ON (f.requester_id = mf.friend_id OR f.addressee_id = mf.friend_id)
  WHERE f.status = 'accepted'
  GROUP BY suggested_id
)
SELECT ff.suggested_id, ff.mutual_count
FROM friends_of_friends ff
WHERE ff.suggested_id != $userId
  AND ff.suggested_id NOT IN (SELECT friend_id FROM my_friends)
  AND ff.suggested_id NOT IN (
    -- Excluir pedidos pendentes em qualquer direção
    SELECT CASE WHEN requester_id = $userId THEN addressee_id ELSE requester_id END
    FROM friendships
    WHERE requester_id = $userId OR addressee_id = $userId
  )
ORDER BY ff.mutual_count DESC
LIMIT 10;
```

Implementar como raw SQL via `db.execute(sql`...`)` no `FriendshipRepository` — a complexidade justifica não usar o query builder do Drizzle aqui.

---

## 4. Birthday Feed — Timezone-Aware

### Problema
O PostgreSQL não tem o timezone do usuário diretamente. A data de aniversário é armazenada como `date` (apenas dia/mês/ano). A lógica de "próximos 30 dias" deve considerar o timezone **do usuário autenticado** (viewer), não UTC.

### Abordagem: Calcular no BFF (Next.js) com Luxon

1. Fastify retorna todos os amigos com `birthDate` + `timezone` do perfil de cada amigo (ou sem timezone — apenas dia/mês)
2. BFF recebe a lista e ordena com Luxon usando o timezone do viewer

**Alternativa mais eficiente:** Fastify faz a query com a janela de 30 dias de forma aproximada (ignorando timezone), retorna candidatos extras (33 dias), e o BFF refina a ordenação com Luxon.

### Query de candidatos (Fastify):
```sql
-- Amigos cujo aniversário cai nos próximos ~33 dias (margem de segurança para timezone)
SELECT u.id, u.username, u.display_name, u.avatar_url, u.birth_date, u.birth_year_hidden
FROM users u
WHERE u.id IN (
  SELECT CASE WHEN f.requester_id = $userId THEN f.addressee_id ELSE f.requester_id END
  FROM friendships f
  WHERE f.status = 'accepted'
    AND (f.requester_id = $userId OR f.addressee_id = $userId)
)
AND (
  -- Aniversário nos próximos 33 dias (usando TO_CHAR para extrair MM-DD)
  MAKE_DATE(
    EXTRACT(YEAR FROM NOW())::int,
    EXTRACT(MONTH FROM u.birth_date)::int,
    EXTRACT(DAY FROM u.birth_date)::int
  ) BETWEEN NOW()::date AND (NOW() + INTERVAL '33 days')::date
  OR
  -- Caso de virada de ano (aniversário em janeiro, query em dezembro)
  MAKE_DATE(
    EXTRACT(YEAR FROM NOW())::int + 1,
    EXTRACT(MONTH FROM u.birth_date)::int,
    EXTRACT(DAY FROM u.birth_date)::int
  ) BETWEEN NOW()::date AND (NOW() + INTERVAL '33 days')::date
)
```

### Refinamento no BFF com Luxon:
```typescript
import { DateTime } from 'luxon';

function getNextBirthday(birthMonthDay: string, viewerTimezone: string): DateTime {
  // birthMonthDay: "03-15" (MM-DD)
  const [month, day] = birthMonthDay.split('-').map(Number);
  const now = DateTime.now().setZone(viewerTimezone);
  let candidate = DateTime.fromObject({ year: now.year, month, day }, { zone: viewerTimezone });
  if (candidate < now.startOf('day')) candidate = candidate.plus({ years: 1 });
  return candidate;
}

// Filtrar e ordenar
const window30 = friends
  .map(f => ({ ...f, nextBirthday: getNextBirthday(f.birthMonthDay, viewerTimezone) }))
  .filter(f => f.nextBirthday.diff(DateTime.now().setZone(viewerTimezone), 'days').days <= 30)
  .sort((a, b) => a.nextBirthday.toMillis() - b.nextBirthday.toMillis());
```

---

## 5. SSE vs WebSocket para Notificações In-App

| Critério | SSE | WebSocket |
|----------|-----|-----------|
| Complexidade | Baixa (HTTP) | Alta (upgrade + protocolo) |
| Direção | Unidirecional (server→client) | Bidirecional |
| Suporte browser | Nativo (EventSource) | Nativo |
| Fastify support | Nativo via `reply.raw` | Plugin `@fastify/websocket` |
| Necessidade v1 | Só receber notificações | Não necessário |

**Decisão: SSE** — suficiente para receber notificações; WebSocket seria over-engineering para v1.

### Redis Pub/Sub para fan-out
- Quando Alice aceita pedido de Bob: `redis.publish('user:bob:events', JSON.stringify({ type: 'friendship_accepted', actor: alice }))`
- Conexão SSE de Bob subscreve `user:bob:events` e repassa ao cliente

**Nota Fastify v5:** Usar `ioredis` (já no stack) com uma conexão dedicada para subscriber (ioredis recomenda conexão separada para `subscribe`).

---

## 6. BullMQ Queue para Fase 6

Apenas enqueue (sem consumer em Fase 4):
```typescript
// apps/api/src/queues/notifications.queue.ts
import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const notificationsQueue = new Queue('notifications', { connection: redis });
```

Jobs a enqueue em Fase 4:
- `friendship_accepted` → enfileirado quando pedido aceito (para notificar o requester)

---

## 7. Paginação de Busca de Usuários (Keyset)

Usar cursor-based pagination em vez de OFFSET para performance:
```typescript
// Cursor: ID do último usuário retornado (UUID v4 → ordem aleatória não é ideal)
// Melhor: cursor por (display_name, id) — ordenar por display_name ASC, id ASC
// Cursor codificado: base64(JSON.stringify({ displayName, id }))

WHERE (display_name, id) > ($cursor_display_name, $cursor_id)
ORDER BY display_name ASC, id ASC
LIMIT $limit + 1
```

Se retornar `limit + 1` resultados → há próxima página. Cursor = último item da página atual.

---

## 8. Pitfalls Conhecidos

1. **Auto-amizade**: check constraint `requester_id != addressee_id` já está no schema — mas validar no service também para erro claro.
2. **Pedido duplicado**: unique constraint `(requester_id, addressee_id)` previne duplicatas na mesma direção. Se Bob tenta enviar para Alice enquanto Alice já enviou para Bob → detectar na service layer e retornar 409 com mensagem clara "Você já recebeu um pedido desta pessoa".
3. **Concorrência**: dois pedidos simultâneos em direções opostas → DB constraint pega um deles. Tratar erro de constraint como 409.
4. **SSE e ioredis**: cada conexão SSE cria um subscriber. Com muitos usuários, pode haver muitas conexões Redis. Em v1 (baixo volume) é OK. Em v2, usar Redis Streams ou um pub/sub broker dedicado.
5. **Feed e aniversários em 29 de fevereiro**: `DateTime.fromObject({ month: 2, day: 29 })` em ano não-bissexto lança erro no Luxon. Mitigar: `{ overflow: 'forward' }` não existe no Luxon; usar try/catch e pular o dia 29 de fev em anos não-bissextos → tratar como 1º de março.

---

*Research completed: 2026-04-30*

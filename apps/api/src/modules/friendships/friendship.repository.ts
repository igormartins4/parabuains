import { friendships, users } from '@parabuains/db';
import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';

export type FriendshipRow = typeof friendships.$inferSelect;
export type FriendUserRow = typeof users.$inferSelect;

export class FriendshipRepository {
  private get db() {
    return getDb();
  }

  /** Encontra linha de amizade entre dois usuários em qualquer direção */
  async findBetween(userAId: string, userBId: string): Promise<FriendshipRow | null> {
    const [row] = await this.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userAId), eq(friendships.addresseeId, userBId)),
          and(eq(friendships.requesterId, userBId), eq(friendships.addresseeId, userAId))
        )
      )
      .limit(1);
    return row ?? null;
  }

  /** Encontra pedido por ID */
  async findById(id: string): Promise<FriendshipRow | null> {
    const [row] = await this.db.select().from(friendships).where(eq(friendships.id, id)).limit(1);
    return row ?? null;
  }

  /** Cria novo pedido de amizade (status: pending) */
  async create(requesterId: string, addresseeId: string): Promise<FriendshipRow> {
    const [row] = await this.db
      .insert(friendships)
      .values({ requesterId, addresseeId, status: 'pending' })
      .returning();
    // biome-ignore lint/style/noNonNullAssertion: Drizzle returning() always yields a row on successful insert
    return row!;
  }

  /** Atualiza status para 'accepted' */
  async accept(id: string): Promise<FriendshipRow> {
    const [row] = await this.db
      .update(friendships)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(friendships.id, id))
      .returning();
    // biome-ignore lint/style/noNonNullAssertion: Drizzle returning() always yields a row on successful update
    return row!;
  }

  /** Remove linha de amizade (recusa ou remoção) */
  async remove(id: string): Promise<void> {
    await this.db.delete(friendships).where(eq(friendships.id, id));
  }

  /** Lista amigos aceitos — retorna dados do usuário amigo */
  async listFriends(userId: string): Promise<FriendUserRow[]> {
    const friendIds = this.db
      .select({
        friendId: sql<string>`CASE WHEN ${friendships.requesterId} = ${userId}
                                   THEN ${friendships.addresseeId}
                                   ELSE ${friendships.requesterId} END`,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
        )
      );

    return this.db.select().from(users).where(sql`${users.id} IN (${friendIds})`);
  }

  /** Lista pedidos recebidos (pending, addressee = userId) */
  async listPendingReceived(
    userId: string
  ): Promise<(FriendshipRow & { requesterUser: FriendUserRow })[]> {
    const rows = await this.db
      .select({ friendship: friendships, requesterUser: users })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.requesterId))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')))
      .orderBy(friendships.createdAt);
    return rows.map((r) => ({ ...r.friendship, requesterUser: r.requesterUser }));
  }

  /** Lista pedidos enviados (pending, requester = userId) */
  async listPendingSent(
    userId: string
  ): Promise<(FriendshipRow & { addresseeUser: FriendUserRow })[]> {
    const rows = await this.db
      .select({ friendship: friendships, addresseeUser: users })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.addresseeId))
      .where(and(eq(friendships.requesterId, userId), eq(friendships.status, 'pending')))
      .orderBy(friendships.createdAt);
    return rows.map((r) => ({ ...r.friendship, addresseeUser: r.addresseeUser }));
  }

  /** Busca usuários por nome/username (ILIKE) com paginação keyset */
  async searchUsers(
    query: string,
    viewerId: string,
    limit: number,
    cursor?: { displayName: string; id: string }
  ): Promise<{ users: FriendUserRow[]; friendships: FriendshipRow[] }> {
    const pattern = `%${query.toLowerCase()}%`;

    const baseWhere = and(
      sql`(LOWER(${users.username}) ILIKE ${pattern} OR LOWER(${users.displayName}) ILIKE ${pattern})`,
      ne(users.id, viewerId)
    );

    const whereWithCursor = cursor
      ? and(
          baseWhere,
          or(
            sql`LOWER(${users.displayName}) > ${cursor.displayName.toLowerCase()}`,
            and(
              sql`LOWER(${users.displayName}) = ${cursor.displayName.toLowerCase()}`,
              sql`${users.id} > ${cursor.id}`
            )
          )
        )
      : baseWhere;

    const foundUsers = await this.db
      .select()
      .from(users)
      .where(whereWithCursor)
      .orderBy(sql`LOWER(${users.displayName}) ASC`, users.id)
      .limit(limit + 1);

    if (foundUsers.length === 0) return { users: [], friendships: [] };

    const userIds = foundUsers.slice(0, limit).map((u) => u.id);

    // Buscar status de amizade para cada resultado usando inArray parametrizado
    const friendshipRows = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          or(eq(friendships.requesterId, viewerId), eq(friendships.addresseeId, viewerId)),
          or(inArray(friendships.requesterId, userIds), inArray(friendships.addresseeId, userIds))
        )
      );

    return { users: foundUsers, friendships: friendshipRows };
  }

  /** Sugestões: amigos de amigos com contagem de mútuos (raw SQL) */
  async getSuggestions(userId: string, limit = 10): Promise<{ id: string; mutualCount: number }[]> {
    const result = await this.db.execute(sql`
      WITH my_friends AS (
        SELECT CASE WHEN requester_id = ${userId} THEN addressee_id ELSE requester_id END AS friend_id
        FROM friendships
        WHERE status = 'accepted'
          AND (requester_id = ${userId} OR addressee_id = ${userId})
      ),
      friends_of_friends AS (
        SELECT
          CASE WHEN f.requester_id = mf.friend_id THEN f.addressee_id ELSE f.requester_id END AS suggested_id,
          COUNT(*) AS mutual_count
        FROM friendships f
        JOIN my_friends mf ON (f.requester_id = mf.friend_id OR f.addressee_id = mf.friend_id)
        WHERE f.status = 'accepted'
        GROUP BY suggested_id
      )
      SELECT ff.suggested_id AS id, ff.mutual_count::int AS "mutualCount"
      FROM friends_of_friends ff
      WHERE ff.suggested_id != ${userId}
        AND ff.suggested_id NOT IN (SELECT friend_id FROM my_friends)
        AND ff.suggested_id NOT IN (
          SELECT CASE WHEN requester_id = ${userId} THEN addressee_id ELSE requester_id END
          FROM friendships
          WHERE requester_id = ${userId} OR addressee_id = ${userId}
        )
      ORDER BY ff.mutual_count DESC
      LIMIT ${limit}
    `);
    return result.rows as { id: string; mutualCount: number }[];
  }

  /** Busca múltiplos usuários por IDs */
  async findManyByIds(ids: string[]): Promise<FriendUserRow[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(users).where(inArray(users.id, ids));
  }
}

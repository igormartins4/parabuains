import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';
import { users, usernameHistory, friendships } from '@parabuains/db';

export class UserRepository {
  private get db() {
    return getDb();
  }

  async findByUsername(username: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(sql`LOWER(${users.username})`, username.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  async isUsernameInHistory(username: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: usernameHistory.id })
      .from(usernameHistory)
      .where(eq(sql`LOWER(${usernameHistory.username})`, username.toLowerCase()))
      .limit(1);
    return !!row;
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      displayName: string;
      bio: string;
      privacyLevel: 'public' | 'friends' | 'private';
      countdownVisibility: 'public' | 'friends';
      birthYearHidden: boolean;
      avatarUrl: string;
    }>,
  ) {
    const [updated] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async changeUsername(userId: string, newUsername: string, oldUsername: string) {
    return this.db.transaction(async (tx) => {
      // Record old username in history
      await tx.insert(usernameHistory).values({
        userId,
        username: oldUsername,
      });
      // Update to new username
      const [updated] = await tx
        .update(users)
        .set({ username: newUsername, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return updated;
    });
  }

  async getMutualFriends(
    userAId: string,
    userBId: string,
  ): Promise<{ count: number; sample: (typeof users.$inferSelect)[] }> {
    const mutuals = await this.db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.id} IN (
            SELECT CASE WHEN requester_id = ${userAId} THEN addressee_id ELSE requester_id END
            FROM friendships
            WHERE status = 'accepted'
            AND (requester_id = ${userAId} OR addressee_id = ${userAId})
          )`,
          sql`${users.id} IN (
            SELECT CASE WHEN requester_id = ${userBId} THEN addressee_id ELSE requester_id END
            FROM friendships
            WHERE status = 'accepted'
            AND (requester_id = ${userBId} OR addressee_id = ${userBId})
          )`,
        ),
      )
      .limit(5);

    const countResult = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(
        and(
          sql`${users.id} IN (
            SELECT CASE WHEN requester_id = ${userAId} THEN addressee_id ELSE requester_id END
            FROM friendships
            WHERE status = 'accepted'
            AND (requester_id = ${userAId} OR addressee_id = ${userAId})
          )`,
          sql`${users.id} IN (
            SELECT CASE WHEN requester_id = ${userBId} THEN addressee_id ELSE requester_id END
            FROM friendships
            WHERE status = 'accepted'
            AND (requester_id = ${userBId} OR addressee_id = ${userBId})
          )`,
        ),
      );

    return { count: Number(countResult[0]?.count ?? 0), sample: mutuals };
  }

  async areFriends(userAId: string, userBId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          sql`(
            (${friendships.requesterId} = ${userAId} AND ${friendships.addresseeId} = ${userBId})
            OR
            (${friendships.requesterId} = ${userBId} AND ${friendships.addresseeId} = ${userAId})
          )`,
        ),
      )
      .limit(1);
    return !!row;
  }
}

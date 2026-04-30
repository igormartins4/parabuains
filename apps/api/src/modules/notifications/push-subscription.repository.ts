import { eq } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';
import { pushSubscriptions } from '@parabuains/db';

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent: string | null;
  createdAt: Date;
}

export interface IPushSubscriptionRepository {
  save(
    userId: string,
    sub: { endpoint: string; p256dhKey: string; authKey: string; userAgent?: string },
  ): Promise<PushSubscription>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
}

export class DrizzlePushSubscriptionRepository implements IPushSubscriptionRepository {
  private get db() {
    return getDb();
  }

  async save(
    userId: string,
    sub: { endpoint: string; p256dhKey: string; authKey: string; userAgent?: string },
  ): Promise<PushSubscription> {
    const [row] = await this.db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: sub.endpoint,
        p256dhKey: sub.p256dhKey,
        authKey: sub.authKey,
        userAgent: sub.userAgent ?? null,
      })
      .onConflictDoNothing()
      .returning();

    // If onConflictDoNothing hit (row undefined), fetch existing
    if (!row) {
      const [existing] = await this.db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, sub.endpoint))
        .limit(1);
      if (!existing) throw new Error('Failed to save push subscription');
      return {
        id: existing.id,
        userId: existing.userId,
        endpoint: existing.endpoint,
        p256dhKey: existing.p256dhKey,
        authKey: existing.authKey,
        userAgent: existing.userAgent,
        createdAt: existing.createdAt,
      };
    }

    return {
      id: row.id,
      userId: row.userId,
      endpoint: row.endpoint,
      p256dhKey: row.p256dhKey,
      authKey: row.authKey,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    };
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      endpoint: r.endpoint,
      p256dhKey: r.p256dhKey,
      authKey: r.authKey,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    }));
  }
}

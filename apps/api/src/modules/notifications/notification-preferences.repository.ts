import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';
import { notificationPreferences } from '@parabuains/db';

export type NotificationChannel = 'email' | 'push';

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: NotificationChannel;
  daysBefore: number[];
  enabled: boolean;
  updatedAt: Date;
}

export interface INotificationPreferencesRepository {
  getByUserId(userId: string): Promise<NotificationPreference[]>;
  upsert(
    userId: string,
    channel: NotificationChannel,
    daysBefore: number[],
    enabled: boolean,
  ): Promise<NotificationPreference>;
}

export class DrizzleNotificationPreferencesRepository
  implements INotificationPreferencesRepository
{
  private get db() {
    return getDb();
  }

  async getByUserId(userId: string): Promise<NotificationPreference[]> {
    const rows = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      channel: r.channel as NotificationChannel,
      daysBefore: r.daysBefore ?? [],
      enabled: r.enabled,
      updatedAt: r.updatedAt,
    }));
  }

  async upsert(
    userId: string,
    channel: NotificationChannel,
    daysBefore: number[],
    enabled: boolean,
  ): Promise<NotificationPreference> {
    const [row] = await this.db
      .insert(notificationPreferences)
      .values({ userId, channel, daysBefore, enabled })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.channel],
        set: {
          daysBefore,
          enabled,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    if (!row) throw new Error('Failed to upsert notification preference');

    return {
      id: row.id,
      userId: row.userId,
      channel: row.channel as NotificationChannel,
      daysBefore: row.daysBefore ?? [],
      enabled: row.enabled,
      updatedAt: row.updatedAt,
    };
  }
}

import { notificationLog } from '@parabuains/db';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';

export type NotificationReminderType = 'D7' | 'D3' | 'D1' | 'Dday';
export type NotificationStatus = 'sent' | 'failed' | 'skipped';

export interface CreateNotificationLogInput {
  recipientId: string;
  subjectId: string;
  channel: string;
  reminderType: NotificationReminderType;
  status: NotificationStatus;
  errorMessage?: string;
}

export interface INotificationLogRepository {
  create(entry: CreateNotificationLogInput): Promise<void>;
  existsForYear(
    recipientId: string,
    subjectId: string,
    channel: string,
    reminderType: string,
    year: number
  ): Promise<boolean>;
}

export class DrizzleNotificationLogRepository implements INotificationLogRepository {
  private get db() {
    return getDb();
  }

  async create(entry: CreateNotificationLogInput): Promise<void> {
    await this.db.insert(notificationLog).values({
      recipientId: entry.recipientId,
      subjectId: entry.subjectId,
      channel: entry.channel,
      reminderType: entry.reminderType,
      status: entry.status,
      errorMessage: entry.errorMessage ?? null,
    });
  }

  async existsForYear(
    recipientId: string,
    subjectId: string,
    channel: string,
    reminderType: string,
    year: number
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(
        and(
          eq(notificationLog.recipientId, recipientId),
          eq(notificationLog.subjectId, subjectId),
          eq(notificationLog.channel, channel),
          eq(notificationLog.reminderType, reminderType),
          sql`extract(year from ${notificationLog.sentAt}) = ${year}`
        )
      )
      .limit(1);

    return !!row;
  }
}

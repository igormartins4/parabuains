import { sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';

export interface RecipientInfo {
  userId: string;
  email: string;
  displayName: string;
  timezone: string;
}

export interface BirthdayPersonInfo {
  userId: string;
  username: string;
  displayName: string;
  birthDate: string; // "YYYY-MM-DD"
}

export interface BirthdayPair {
  recipient: RecipientInfo;
  birthdayPerson: BirthdayPersonInfo;
}

export interface IBirthdaySchedulerRepository {
  getUpcomingBirthdayPairs(daysAhead: number): Promise<BirthdayPair[]>;
}

export class DrizzleBirthdaySchedulerRepository implements IBirthdaySchedulerRepository {
  private get db() {
    return getDb();
  }

  /**
   * Returns all (recipient, birthdayPerson) pairs where:
   * - They are accepted friends
   * - The birthday person's birthday (month+day) falls within daysAhead days from today (UTC)
   *
   * Uses a conservative UTC window; timezone-aware refinement is done in the scheduler worker.
   */
  async getUpcomingBirthdayPairs(daysAhead: number): Promise<BirthdayPair[]> {
    const rows = await this.db.execute<{
      recipientId: string;
      recipientEmail: string;
      recipientDisplayName: string;
      recipientTimezone: string;
      birthdayPersonId: string;
      birthdayPersonUsername: string;
      birthdayPersonDisplayName: string;
      birthDate: string;
    }>(sql`
      SELECT
        r.id                  AS "recipientId",
        r.email               AS "recipientEmail",
        r.display_name        AS "recipientDisplayName",
        r.timezone            AS "recipientTimezone",
        bp.id                 AS "birthdayPersonId",
        bp.username           AS "birthdayPersonUsername",
        bp.display_name       AS "birthdayPersonDisplayName",
        bp.birth_date::text   AS "birthDate"
      FROM friendships f
      JOIN users r  ON r.id  = CASE WHEN f.requester_id = bp.id THEN f.addressee_id ELSE f.requester_id END
      JOIN users bp ON bp.id = CASE WHEN f.requester_id = r.id  THEN f.addressee_id ELSE f.requester_id END
      WHERE f.status = 'accepted'
        AND r.deleted_at IS NULL
        AND bp.deleted_at IS NULL
        AND (
          -- Check if birthday (this year) falls within the window
          (
            make_date(
              extract(year from current_date)::int,
              extract(month from bp.birth_date)::int,
              extract(day from bp.birth_date)::int
            ) BETWEEN current_date AND current_date + ${daysAhead}::int
          )
          OR
          -- Wrap around year boundary
          (
            make_date(
              extract(year from current_date)::int + 1,
              extract(month from bp.birth_date)::int,
              extract(day from bp.birth_date)::int
            ) BETWEEN current_date AND current_date + ${daysAhead}::int
          )
        )
    `);

    return rows.rows.map((row) => ({
      recipient: {
        userId: row.recipientId,
        email: row.recipientEmail,
        displayName: row.recipientDisplayName,
        timezone: row.recipientTimezone,
      },
      birthdayPerson: {
        userId: row.birthdayPersonId,
        username: row.birthdayPersonUsername,
        displayName: row.birthdayPersonDisplayName,
        birthDate: typeof row.birthDate === 'string' ? row.birthDate : String(row.birthDate),
      },
    }));
  }
}

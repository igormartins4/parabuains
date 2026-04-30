import { sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';

export interface BirthdayCandidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  birthDate: string; // ISO date string "YYYY-MM-DD"
  birthYearHidden: boolean;
  timezone: string;
}

export class FeedRepository {
  private get db() {
    return getDb();
  }

  /**
   * Retorna amigos do userId cujo aniversário cai nos próximos ~33 dias (UTC aproximado).
   * O serviço refina a janela exata por timezone.
   */
  async getBirthdayCandidates(userId: string): Promise<BirthdayCandidate[]> {
    const rows = await this.db.execute(sql`
      SELECT
        u.id,
        u.username,
        u.display_name   AS "displayName",
        u.avatar_url     AS "avatarUrl",
        u.birth_date     AS "birthDate",
        u.birth_year_hidden AS "birthYearHidden",
        u.timezone
      FROM users u
      WHERE u.id IN (
        SELECT CASE
          WHEN f.requester_id = ${userId} THEN f.addressee_id
          ELSE f.requester_id
        END
        FROM friendships f
        WHERE f.status = 'accepted'
          AND (f.requester_id = ${userId} OR f.addressee_id = ${userId})
      )
      AND (
        -- Aniversário nos próximos 33 dias neste ano
        MAKE_DATE(
          EXTRACT(YEAR FROM NOW())::int,
          EXTRACT(MONTH FROM u.birth_date)::int,
          EXTRACT(DAY FROM u.birth_date)::int
        ) BETWEEN NOW()::date AND (NOW() + INTERVAL '33 days')::date
        OR
        -- Virada de ano: aniversário em janeiro quando estamos em dezembro
        MAKE_DATE(
          EXTRACT(YEAR FROM NOW())::int + 1,
          EXTRACT(MONTH FROM u.birth_date)::int,
          EXTRACT(DAY FROM u.birth_date)::int
        ) BETWEEN NOW()::date AND (NOW() + INTERVAL '33 days')::date
      )
      ORDER BY
        EXTRACT(MONTH FROM u.birth_date),
        EXTRACT(DAY FROM u.birth_date)
    `);

    return rows.rows as unknown as BirthdayCandidate[];
  }
}

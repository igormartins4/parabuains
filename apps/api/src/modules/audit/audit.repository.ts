import { auditLogs } from '@parabuains/db';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';

export interface AuditInsertParams {
  actorId?: string | null;
  action: string;
  resource?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditRepository {
  private get db() {
    return getDb();
  }

  async insert(params: AuditInsertParams): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorId: params.actorId ?? null,
      action: params.action,
      resource: params.resource ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    });
  }

  /** Deleta registros anteriores a `cutoff`. Retorna número de rows deletadas. */
  async deleteBefore(cutoff: Date): Promise<number> {
    const result = await this.db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
    return result.rowCount ?? 0;
  }

  /** Busca audit logs de um actor específico (últimos 90 dias), paginado. */
  async findByActor(actorId: string, options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return this.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.actorId, actorId), gte(auditLogs.createdAt, ninetyDaysAgo)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}

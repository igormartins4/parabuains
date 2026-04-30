import { Queue, Worker } from 'bullmq';
import { getRedis } from '../../infrastructure/redis.js';
import { AuditRepository } from '../audit/audit.repository.js';

export const CLEANUP_AUDIT_JOB_NAME = 'cleanup-audit-logs';

export interface CleanupAuditLogsResult {
  deleted: number;
}

/**
 * Deleta audit_logs com mais de 90 dias em batches de 1000 rows.
 * Retorna total deletado.
 */
export async function cleanupAuditLogs(
  logFn: (msg: string) => void,
  auditRepo: AuditRepository
): Promise<CleanupAuditLogsResult> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  let totalDeleted = 0;
  let deleted: number;

  do {
    deleted = await auditRepo.deleteBefore(cutoff);
    totalDeleted += deleted;
    if (deleted > 0) {
      logFn(`Deleted ${deleted} audit_logs rows (total so far: ${totalDeleted})`);
    }
  } while (deleted >= 1000); // continua enquanto houver batch completo

  return { deleted: totalDeleted };
}

// Lazy singletons for queue and worker
let _maintenanceQueue: Queue | null = null;
let _maintenanceWorker: Worker | null = null;

export function getMaintenanceQueue(): Queue {
  if (!_maintenanceQueue) {
    _maintenanceQueue = new Queue('maintenance', {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 20 },
      },
    });
  }
  return _maintenanceQueue;
}

/**
 * Registra o job scheduler diário de cleanup (03:00 UTC).
 * Idempotente — usa upsertJobScheduler para não duplicar em restart.
 */
export async function registerAuditCleanupScheduler(): Promise<void> {
  const queue = getMaintenanceQueue();
  await queue.upsertJobScheduler(
    CLEANUP_AUDIT_JOB_NAME,
    { pattern: '0 3 * * *' }, // 03:00 UTC diariamente
    { name: CLEANUP_AUDIT_JOB_NAME, data: {} }
  );
}

export function startMaintenanceWorker(): Worker {
  if (_maintenanceWorker) return _maintenanceWorker;

  const auditRepo = new AuditRepository();

  _maintenanceWorker = new Worker(
    'maintenance',
    async (job) => {
      if (job.name === CLEANUP_AUDIT_JOB_NAME) {
        const result = await cleanupAuditLogs((msg) => void job.log(msg), auditRepo);
        console.info(`[AuditCleanup] Cleanup complete: ${result.deleted} rows deleted`);
        return result;
      }
      return undefined;
    },
    { connection: getRedis(), concurrency: 1 }
  );

  _maintenanceWorker.on('failed', (job, err) => {
    console.error(`[Maintenance] Job ${job?.id} (${job?.name}) failed:`, err);
  });

  console.info('[Maintenance] Worker started — audit cleanup cron at 03:00 UTC');
  return _maintenanceWorker;
}

import { Queue } from 'bullmq';
import { getRedis } from '../infrastructure/redis.js';

export interface FriendshipAcceptedJob {
  type: 'friendship_accepted';
  recipientId: string; // quem enviou o pedido original (será notificado)
  actorId: string; // quem aceitou o pedido
  friendshipId: string;
}

// Fase 6 adicionará mais tipos de jobs:
// - birthday_reminder
// - wall_message_received

// Lazy singleton — Queue is created on first use, not at module load time
let _notificationsQueue: Queue | null = null;

export function getNotificationsQueue(): Queue {
  if (!_notificationsQueue) {
    _notificationsQueue = new Queue('notifications', {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return _notificationsQueue;
}

/** @deprecated Use getNotificationsQueue() instead. Kept for backward compat. */
export const notificationsQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    return (getNotificationsQueue() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

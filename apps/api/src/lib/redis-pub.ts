import { getRedis } from '../infrastructure/redis.js';

/**
 * Publishes an event to a user-specific Redis channel for SSE delivery.
 * Uses the shared Redis client from infrastructure (lazy singleton).
 */
export async function publishUserEvent(userId: string, event: object): Promise<void> {
  const channel = `user:${userId}:events`;
  const message = JSON.stringify(event);
  await getRedis().publish(channel, message);
}

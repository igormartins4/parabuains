import type { Redis } from 'ioredis';
import { AuditRepository } from '../audit/audit.repository.js';
import { TooManyRequestsError } from '../../errors.js';

/**
 * AnomalyDetectionService — Redis threshold-based anomaly detection.
 *
 * Uses Redis INCR + EXPIRE (sliding window counters) with zero additional
 * infrastructure. All thresholds per 07-CONTEXT.md D-03.
 */
export class AnomalyDetectionService {
  constructor(
    private readonly redis: Redis,
    private readonly auditRepo: AuditRepository,
  ) {}

  /**
   * Login flood por IP: 20 falhas / 1 hora → bloqueia IP + loga anomalia.
   */
  async checkLoginFlood(ip: string): Promise<void> {
    const key = `anomaly:login:ip:${ip}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // sliding window 1h

    if (count > 20) {
      await this.auditRepo.insert({
        action: 'anomaly.login_flood',
        ipAddress: ip,
        metadata: { ip, count, threshold: 20, windowSeconds: 3600 },
      });
      throw new TooManyRequestsError(`Login flood detected from IP ${ip}`);
    }
  }

  /**
   * Login flood por email: 10 falhas / 15 min → loga anomalia
   * (lockout já gerenciado pela Phase 2 — aqui apenas auditamos).
   */
  async checkLoginFloodByEmail(email: string): Promise<void> {
    const key = `anomaly:login:email:${email}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 900); // 15 min

    if (count > 10) {
      await this.auditRepo.insert({
        action: 'anomaly.login_flood_email',
        metadata: { email, count, threshold: 10, windowSeconds: 900 },
      });
      // Lockout já tratado pelo Phase 2 AccountLockout — aqui apenas auditamos
    }
  }

  /**
   * Message flood: 50 mensagens / 1 hora por userId → 429 + loga anomalia.
   */
  async checkMessageFlood(userId: string): Promise<void> {
    const key = `anomaly:message:user:${userId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600);

    if (count > 50) {
      await this.auditRepo.insert({
        actorId: userId,
        action: 'anomaly.message_flood',
        resource: `user:${userId}`,
        metadata: { userId, count, threshold: 50, windowSeconds: 3600 },
      });
      throw new TooManyRequestsError('Message rate limit exceeded');
    }
  }

  /**
   * Friendship flood: 30 requests / 1 hora por userId → 429 + loga anomalia.
   */
  async checkFriendshipFlood(userId: string): Promise<void> {
    const key = `anomaly:friendship:user:${userId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600);

    if (count > 30) {
      await this.auditRepo.insert({
        actorId: userId,
        action: 'anomaly.friendship_flood',
        resource: `user:${userId}`,
        metadata: { userId, count, threshold: 30, windowSeconds: 3600 },
      });
      throw new TooManyRequestsError('Friendship request rate limit exceeded');
    }
  }

  /**
   * Password reset flood: 5 requests / 1 hora por IP → silencioso (não lança erro) + loga anomalia.
   * Returns true if flooded (caller should silently ignore).
   */
  async checkResetFlood(ip: string): Promise<boolean> {
    const key = `anomaly:reset:ip:${ip}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600);

    if (count > 5) {
      await this.auditRepo.insert({
        action: 'anomaly.reset_flood',
        ipAddress: ip,
        metadata: { ip, count, threshold: 5, windowSeconds: 3600 },
      });
      return true; // ignorar silenciosamente (não revelar ao atacante)
    }
    return false;
  }
}

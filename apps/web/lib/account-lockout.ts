import IORedis from 'ioredis';

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;
const LOCKOUT_SECONDS = 30 * 60;

let _redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    });
    _redis.on('error', (err) => console.error('[AccountLockout Redis]', err.message));
  }
  return _redis;
}

function attemptsKey(email: string) {
  return `auth:attempts:${email.toLowerCase()}`;
}

function lockoutKey(email: string) {
  return `auth:lockout:${email.toLowerCase()}`;
}

export async function isAccountLocked(email: string): Promise<{ locked: boolean; ttl?: number }> {
  try {
    const ttl = await getRedis().ttl(lockoutKey(email));
    if (ttl > 0) return { locked: true, ttl };
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

export async function recordFailedAttempt(email: string): Promise<{ attempts: number; locked: boolean }> {
  try {
    const redis = getRedis();
    const key = attemptsKey(email);
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    if (attempts >= MAX_ATTEMPTS) {
      await redis.set(lockoutKey(email), '1', 'EX', LOCKOUT_SECONDS);
      await redis.del(key);
      return { attempts, locked: true };
    }
    return { attempts, locked: false };
  } catch {
    return { attempts: 0, locked: false };
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    await getRedis().del(attemptsKey(email));
  } catch {
    // ignore
  }
}

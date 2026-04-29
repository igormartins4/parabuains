import IORedis from 'ioredis';

function createRedisClient() {
  const url = process.env['REDIS_URL'];
  if (!url) {
    throw new Error('REDIS_URL environment variable is required');
  }
  const client = new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  return client;
}

// Lazy singleton — only created on first access
let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    _redis = createRedisClient();
  }
  return _redis;
}

// Named export for convenience (backwards compat with plugin imports)
export const redis = new Proxy({} as IORedis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

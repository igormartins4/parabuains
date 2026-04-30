import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { getRedis } from '../infrastructure/redis.js';

export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  // In test env, skip Redis store to avoid connection errors
  const redisStore = process.env.NODE_ENV === 'test' ? undefined : getRedis();

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: redisStore,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
    }),
  });
});

import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/db.js';
import { redis } from '../../infrastructure/redis.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      config: { skipAuth: true },
      schema: {
        tags: ['health'],
        summary: 'Infrastructure health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              db: { type: 'string' },
              redis: { type: 'string' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      let dbStatus = 'connected';
      try {
        await db.execute(sql`SELECT 1`);
      } catch {
        dbStatus = 'error';
      }

      let redisStatus = 'connected';
      try {
        await redis.ping();
      } catch {
        redisStatus = 'error';
      }

      const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';
      reply.code(allHealthy ? 200 : 503);
      return {
        status: allHealthy ? 'ok' : 'degraded',
        db: dbStatus,
        redis: redisStatus,
      };
    }
  );
}

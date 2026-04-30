import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../infrastructure/db.js';
import { redis } from '../../infrastructure/redis.js';

const startTime = Date.now();

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
              version: { type: 'string' },
              uptime: { type: 'number' },
              db: { type: 'object' },
              redis: { type: 'object' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              version: { type: 'string' },
              uptime: { type: 'number' },
              db: { type: 'object' },
              redis: { type: 'object' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      // DB check with latency
      let dbStatus = 'connected';
      let dbLatencyMs: number | null = null;
      const dbStart = Date.now();
      try {
        await db.execute(sql`SELECT 1`);
        dbLatencyMs = Date.now() - dbStart;
      } catch (err) {
        dbStatus = 'error';
        app.log.warn({ err }, 'Health check: DB unavailable');
      }

      // Redis check with latency
      let redisStatus = 'connected';
      let redisLatencyMs: number | null = null;
      const redisStart = Date.now();
      try {
        await redis.ping();
        redisLatencyMs = Date.now() - redisStart;
      } catch (err) {
        redisStatus = 'error';
        app.log.warn({ err }, 'Health check: Redis unavailable');
      }

      const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';
      reply.code(allHealthy ? 200 : 503);
      return {
        status: allHealthy ? 'ok' : 'degraded',
        version: process.env.npm_package_version ?? 'unknown',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        db: { status: dbStatus, latencyMs: dbLatencyMs },
        redis: { status: redisStatus, latencyMs: redisLatencyMs },
      };
    }
  );
}

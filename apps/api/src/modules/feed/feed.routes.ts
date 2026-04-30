import type { FastifyInstance } from 'fastify';
import { AppError } from '../../errors.js';
import { getRedis } from '../../infrastructure/redis.js';
import { UserRepository } from '../users/user.repository.js';
import { FeedRepository } from './feed.repository.js';
import { FeedService } from './feed.service.js';

const FEED_CACHE_TTL_SECONDS = 300; // 5 minutes

export async function feedRoutes(fastify: FastifyInstance) {
  const feedRepo = new FeedRepository();
  const feedService = new FeedService(feedRepo);
  const userRepo = new UserRepository();

  // Error handler for AppError instances
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    reply.send(error);
  });

  // GET /feed/birthdays — feed de aniversários dos próximos 30 dias
  fastify.get('/feed/birthdays', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const cacheKey = `feed:birthdays:${request.userId}`;

    // Try cache first (only in non-test env to avoid Redis dependency in tests)
    if (process.env.NODE_ENV !== 'test') {
      try {
        const redis = getRedis();
        const cached = await redis.get(cacheKey);
        if (cached) {
          reply.header('X-Cache', 'HIT');
          return reply.send(JSON.parse(cached));
        }
      } catch {
        // Redis unavailable — fall through to DB
      }
    }

    // Obter timezone do usuário autenticado
    const viewer = await userRepo.findById(request.userId);
    const viewerTimezone = viewer?.timezone ?? 'UTC';

    const feed = await feedService.getBirthdayFeed(request.userId, viewerTimezone);

    // Populate cache
    if (process.env.NODE_ENV !== 'test') {
      try {
        const redis = getRedis();
        await redis.set(cacheKey, JSON.stringify(feed), 'EX', FEED_CACHE_TTL_SECONDS);
      } catch {
        // Cache write failure is non-fatal
      }
    }

    reply.header('X-Cache', 'MISS');
    return reply.send(feed);
  });
}

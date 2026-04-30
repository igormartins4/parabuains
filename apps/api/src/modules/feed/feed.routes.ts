import type { FastifyInstance } from 'fastify';
import { FeedRepository } from './feed.repository.js';
import { FeedService } from './feed.service.js';
import { UserRepository } from '../users/user.repository.js';
import { AppError } from '../../errors.js';

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

    // Obter timezone do usuário autenticado
    const viewer = await userRepo.findById(request.userId);
    const viewerTimezone = viewer?.timezone ?? 'UTC';

    const feed = await feedService.getBirthdayFeed(request.userId, viewerTimezone);
    return reply.send(feed);
  });
}

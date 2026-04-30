import type { FastifyInstance } from 'fastify';
import { AppError } from '../../errors.js';
import { getRedis } from '../../infrastructure/redis.js';
import { getNotificationsQueue } from '../../queues/notifications.queue.js';
import { AnomalyDetectionService } from '../anomaly/anomaly-detection.service.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { DrizzleMessageRepository } from './message.repository.js';
import { MessageService } from './message.service.js';
import type { WallSettings } from './message.types.js';

export async function messageRoutes(fastify: FastifyInstance): Promise<void> {
  const repo = new DrizzleMessageRepository();
  // Lazy: only call getNotificationsQueue() inside handlers, not at module init
  const service = new MessageService(repo, {
    add: (...args: Parameters<ReturnType<typeof getNotificationsQueue>['add']>) =>
      getNotificationsQueue().add(...args),
  } as ReturnType<typeof getNotificationsQueue>);
  // Anomaly detection — only connect Redis in non-test env
  const anomalyService =
    process.env.NODE_ENV !== 'test'
      ? new AnomalyDetectionService(getRedis(), new AuditRepository())
      : null;

  // Error handler for AppError instances and service errors
  fastify.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      reply.code(err.statusCode).send({ error: 'ERROR', message: err.message ?? 'Unknown error' });
      return;
    }
    reply.send(error);
  });

  /**
   * GET /users/:username/wall
   * List published messages on a user's wall.
   * Public endpoint — auth optional (affects visibility of private messages).
   */
  fastify.get('/users/:username/wall', { config: { skipAuth: true } }, async (request, reply) => {
    const { username } = request.params as { username: string };
    const viewerId = request.userId;
    const messages = await service.getWallMessages(username, viewerId);
    return reply.send({ messages });
  });

  /**
   * POST /users/:username/wall
   * Post a message on a user's wall. Requires authentication.
   * Includes honeypot field to silently reject bots.
   * Rate limit: 20 req/hour per user.
   */
  fastify.post<{
    Params: { username: string };
    Body: { content: string; type: 'public' | 'private' | 'anonymous'; website?: string };
  }>(
    '/users/:username/wall',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: 3600 * 1000, // 1 hour in ms
          keyGenerator: (req) => (req as typeof req & { userId?: string | null }).userId ?? req.ip,
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      // Honeypot: silently discard bot submissions
      if (request.body.website) {
        return reply.status(201).send({ id: 'ok', content: '' });
      }

      const { username } = request.params;
      const authorId = request.userId;

      request.auditAction = 'message.post';
      request.auditResource = `user:${username}`;
      // Anomaly detection: check message flood
      if (anomalyService) {
        await anomalyService.checkMessageFlood(authorId);
      }

      const profile = await repo.findUserWithWallSettings(username);
      if (!profile)
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });

      // Enforce wall_who_can_post permission
      if (profile.wallWhoCanPost === 'friends' && authorId !== profile.id) {
        const areFriends = await repo.isFriend(authorId, profile.id);
        if (!areFriends) {
          return reply
            .status(403)
            .send({ error: 'FORBIDDEN', message: 'Only friends can post on this wall' });
        }
      }

      const message = await service.postMessage({
        profileId: profile.id,
        authorId,
        content: request.body.content,
        type: request.body.type,
      });

      return reply.status(201).send(message);
    }
  );

  /**
   * DELETE /wall-messages/:id
   * Soft-delete a message. Only wall owner or message author (non-anonymous) can delete.
   */
  fastify.delete<{ Params: { id: string } }>('/wall-messages/:id', {}, async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    request.auditAction = 'message.delete';
    request.auditResource = `message:${request.params.id}`;
    await service.deleteMessage(request.params.id, request.userId);
    return reply.status(204).send();
  });

  /**
   * PATCH /wall-messages/:id/approve
   * Approve a pending message. Wall owner only.
   */
  fastify.patch<{ Params: { id: string } }>(
    '/wall-messages/:id/approve',
    {},
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }
      const message = await service.approveMessage(request.params.id, request.userId);
      return reply.send(message);
    }
  );

  /**
   * PATCH /wall-messages/:id/reject
   * Reject a pending message. Wall owner only.
   */
  fastify.patch<{ Params: { id: string } }>(
    '/wall-messages/:id/reject',
    {},
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }
      await service.rejectMessage(request.params.id, request.userId);
      return reply.status(204).send();
    }
  );

  /**
   * POST /wall-messages/:id/report
   * Report a message as inappropriate.
   * Rate limit: 10 req/hour per user.
   */
  fastify.post<{
    Params: { id: string };
    Body: { reason: 'spam' | 'harassment' | 'inappropriate' | 'other' };
  }>(
    '/wall-messages/:id/report',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: 3600 * 1000, // 1 hour
          keyGenerator: (req) => (req as typeof req & { userId?: string | null }).userId ?? req.ip,
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }
      request.auditAction = 'message.report';
      request.auditResource = `message:${request.params.id}`;
      await service.reportMessage(request.params.id, request.userId, request.body.reason);
      return reply.status(201).send({ reported: true });
    }
  );

  /**
   * GET /users/me/wall/pending
   * Get pending messages awaiting approval for the authenticated wall owner.
   */
  fastify.get('/users/me/wall/pending', {}, async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const messages = await service.getPendingMessages(request.userId);
    return reply.send({ messages });
  });

  /**
   * PUT /users/me/wall/settings
   * Update wall configuration (who_can_post, allow_anonymous, require_approval).
   */
  fastify.put<{ Body: Partial<WallSettings> }>(
    '/users/me/wall/settings',
    {},
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }
      request.auditAction = 'wall.settings_update';
      request.auditResource = `user:${request.userId}`;
      await service.updateWallSettings(request.userId, request.body);
      return reply.send({ updated: true });
    }
  );
}

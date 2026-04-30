import type { FastifyInstance } from 'fastify';
import { FriendshipService } from './friendship.service.js';
import { FriendshipRepository } from './friendship.repository.js';
import {
  sendRequestSchema,
  friendshipIdParamsSchema,
  targetUserIdParamsSchema,
  searchQuerySchema,
} from './friendship.schemas.js';
import { AppError } from '../../errors.js';

export async function friendshipRoutes(fastify: FastifyInstance) {
  const repo = new FriendshipRepository();
  const service = new FriendshipService(repo);

  // Error handler for AppError instances
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    reply.send(error);
  });

  // POST /friendships — enviar pedido de amizade
  fastify.post('/friendships', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const body = sendRequestSchema.parse(request.body);
    const result = await service.sendRequest(request.userId, body.addresseeId);
    return reply.status(201).send(result);
  });

  // GET /friendships — listar amigos aceitos
  fastify.get('/friendships', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const friends = await service.listFriends(request.userId);
    return reply.send({ friends });
  });

  // GET /friendships/pending — pedidos recebidos (must come before /:id)
  fastify.get('/friendships/pending', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const requests = await service.listPendingReceived(request.userId);
    return reply.send({ requests });
  });

  // GET /friendships/sent — pedidos enviados (must come before /:id)
  fastify.get('/friendships/sent', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const requests = await service.listPendingSent(request.userId);
    return reply.send({ requests });
  });

  // GET /friendships/suggestions — amigos de amigos (must come before /:id)
  fastify.get('/friendships/suggestions', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const suggestions = await service.getSuggestions(request.userId);
    return reply.send({ suggestions });
  });

  // POST /friendships/:id/accept — aceitar pedido
  fastify.post('/friendships/:id/accept', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const { id } = friendshipIdParamsSchema.parse(request.params);
    const result = await service.acceptRequest(id, request.userId);
    return reply.send(result);
  });

  // DELETE /friendships/:id — recusar ou remover amizade
  fastify.delete('/friendships/:id', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const { id } = friendshipIdParamsSchema.parse(request.params);
    await service.removeOrDecline(id, request.userId);
    return reply.status(204).send();
  });

  // GET /friendships/status/:targetUserId — status de amizade bilateral
  fastify.get('/friendships/status/:targetUserId', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const { targetUserId } = targetUserIdParamsSchema.parse(request.params);
    const result = await service.getStatus(request.userId, targetUserId);
    return reply.send(result);
  });

  // GET /users/search — busca de usuários com friendshipStatus
  fastify.get('/users/search', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const { q, limit, cursor } = searchQuerySchema.parse(request.query);

    let cursorObj: { displayName: string; id: string } | undefined;
    if (cursor) {
      try {
        cursorObj = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as {
          displayName: string;
          id: string;
        };
      } catch {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Invalid cursor' });
      }
    }

    const result = await service.searchUsers(q, request.userId, limit, cursorObj);

    const encodedNextCursor = result.nextCursor
      ? Buffer.from(JSON.stringify(result.nextCursor)).toString('base64')
      : null;

    return reply.send({ results: result.results, nextCursor: encodedNextCursor });
  });
}

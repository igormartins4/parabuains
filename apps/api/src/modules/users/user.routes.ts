import type { FastifyInstance } from 'fastify';
import { AppError } from '../../errors.js';
import { require2FAIfEnabled } from '../audit/totp-enforcement.js';
import { UserRepository } from './user.repository.js';
import {
  getProfileParamsSchema,
  mutualFriendsParamsSchema,
  updateProfileSchema,
  usernameChangeSchema,
} from './user.schemas.js';
import { UserService } from './user.service.js';

export async function userRoutes(fastify: FastifyInstance) {
  const repo = new UserRepository();
  const service = new UserService(repo);

  // Error handler for AppError instances
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    // Re-throw for default Fastify error handling
    reply.send(error);
  });

  // GET /v1/users/:username — public profile (respects privacy)
  fastify.get('/users/:username', { config: { skipAuth: true } }, async (request, reply) => {
    const { username } = getProfileParamsSchema.parse(request.params);
    const viewerId = request.userId ?? undefined;
    const profile = await service.getProfile(username, viewerId);
    return reply.send(profile);
  });

  // PUT /v1/users/me/profile — update own profile (auth required)
  fastify.put('/users/me/profile', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    request.auditAction = 'user.profile_update';
    request.auditResource = `user:${request.userId}`;
    const data = updateProfileSchema.parse(request.body);
    const updated = await service.updateProfile(request.userId, data);
    return reply.send(updated);
  });

  // POST /v1/users/me/username — change username (auth required, 2FA if enabled)
  fastify.post('/users/me/username', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    // 2FA enforcement: require X-2FA-Verified header if 2FA is enabled
    await require2FAIfEnabled(
      request.userId,
      request.headers['x-2fa-verified'] as string | undefined
    );
    request.auditAction = 'user.username_change';
    request.auditResource = `user:${request.userId}`;
    const input = usernameChangeSchema.parse(request.body);
    const updated = await service.changeUsername(request.userId, input);
    return reply.send({ username: (updated as { username: string }).username });
  });

  // GET /v1/users/:username/mutual-friends — mutual friends (auth required)
  fastify.get('/users/:username/mutual-friends', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const { username } = mutualFriendsParamsSchema.parse(request.params);
    const result = await service.getMutualFriends(username, request.userId);
    return reply.send(result);
  });
}

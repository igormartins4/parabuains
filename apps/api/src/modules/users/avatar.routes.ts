import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AvatarService } from './avatar.service.js';
import { UserRepository } from './user.repository.js';
import { AppError } from '../../errors.js';

const uploadUrlRequestSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024),
});

export async function avatarRoutes(fastify: FastifyInstance) {
  const avatarService = new AvatarService();
  const userRepo = new UserRepository();

  // Error handler for AppError instances
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    reply.send(error);
  });

  // POST /v1/users/me/avatar-url — generate presigned upload URL (auth required)
  fastify.post('/users/me/avatar-url', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const { mimeType, fileSize } = uploadUrlRequestSchema.parse(request.body);
    const result = await avatarService.generateUploadUrl(request.userId, mimeType, fileSize);
    return reply.send(result);
  });

  // POST /v1/users/me/avatar-confirm — called by BFF after Sharp processing
  fastify.post('/users/me/avatar-confirm', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const avatarUrl = avatarService.getAvatarPublicUrl(request.userId);
    const updated = await userRepo.updateProfile(request.userId, { avatarUrl });
    return reply.send({ avatarUrl: updated?.avatarUrl });
  });
}

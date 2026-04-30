import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { avatarRoutes } from './avatar.routes.js';
import { userRoutes } from './user.routes.js';

export const usersPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(userRoutes);
    await fastify.register(avatarRoutes);
  },
  { name: 'users' }
);

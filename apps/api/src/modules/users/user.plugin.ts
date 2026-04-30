import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { userRoutes } from './user.routes.js';
import { avatarRoutes } from './avatar.routes.js';

export const usersPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(userRoutes);
    await fastify.register(avatarRoutes);
  },
  { name: 'users' },
);

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { friendshipRoutes } from './friendship.routes.js';

export const friendshipsPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(friendshipRoutes);
  },
  { name: 'friendships' }
);

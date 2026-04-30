import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { feedRoutes } from './feed.routes.js';

export const feedPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(feedRoutes);
  },
  { name: 'feed' },
);

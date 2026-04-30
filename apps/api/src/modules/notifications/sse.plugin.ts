import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { sseRoutes } from './sse.routes.js';

export const ssePlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(sseRoutes);
  },
  { name: 'sse' },
);

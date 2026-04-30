import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { messageRoutes } from './message.routes.js';

export const messagesPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(messageRoutes);
  },
  { name: 'messages' }
);

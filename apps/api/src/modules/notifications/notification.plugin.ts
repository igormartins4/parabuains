import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { notificationPreferencesRoutes } from './notification-preferences.routes.js';

export const notificationPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(notificationPreferencesRoutes);
  },
  { name: 'notifications' },
);

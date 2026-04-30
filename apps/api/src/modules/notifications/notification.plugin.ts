import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { notificationPreferencesRoutes } from './notification-preferences.routes.js';
import { pushSubscriptionRoutes } from './push-subscription.routes.js';

export const notificationPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(notificationPreferencesRoutes);
    await fastify.register(pushSubscriptionRoutes);
  },
  { name: 'notifications' }
);

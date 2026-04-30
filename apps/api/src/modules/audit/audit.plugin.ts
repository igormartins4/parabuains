import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { auditRoutes } from './audit.routes.js';

export const auditModulePlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(auditRoutes);
});

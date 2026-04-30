import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { auditRoutes } from './audit.routes.js';

export const auditModulePlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(auditRoutes);
});

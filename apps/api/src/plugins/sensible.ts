import sensible from '@fastify/sensible';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async function sensiblePlugin(app: FastifyInstance) {
  await app.register(sensible);
});

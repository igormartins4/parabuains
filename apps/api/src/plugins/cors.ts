import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async function corsPlugin(app: FastifyInstance) {
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',');
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
});

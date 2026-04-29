import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';

export default fp(async function jwtPlugin(app: FastifyInstance) {
  if (!process.env.API_JWT_SECRET) {
    throw new Error('API_JWT_SECRET environment variable is required');
  }
  await app.register(jwt, {
    secret: process.env.API_JWT_SECRET,
    sign: { expiresIn: '60s' },
  });
});

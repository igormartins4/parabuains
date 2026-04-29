import fp from 'fastify-plugin';
import { userRoutes } from './user.routes.js';

export const usersPlugin = fp(userRoutes, {
  name: 'users',
});

import Fastify from 'fastify';
import helmetPlugin from './plugins/helmet.js';
import corsPlugin from './plugins/cors.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import jwtPlugin from './plugins/jwt.js';
import authPlugin from './plugins/auth.js';
import swaggerPlugin from './plugins/swagger.js';
import sensiblePlugin from './plugins/sensible.js';
import { healthRoutes } from './modules/health/routes.js';
import { usersPlugin } from './modules/users/user.plugin.js';
import { friendshipsPlugin } from './modules/friendships/friendship.plugin.js';
import { feedPlugin } from './modules/feed/feed.plugin.js';
import { ssePlugin } from './modules/notifications/sse.plugin.js';
import { messagesPlugin } from './modules/messages/message.plugin.js';
import { notificationPlugin } from './modules/notifications/notification.plugin.js';

export async function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : true,
  });

  // Security middleware — order matters
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(jwtPlugin);
  await app.register(authPlugin);

  // API documentation (dev only)
  await app.register(swaggerPlugin);

  // HTTP helpers
  await app.register(sensiblePlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(usersPlugin, { prefix: '/v1' });
  await app.register(friendshipsPlugin, { prefix: '/v1' });
  await app.register(feedPlugin, { prefix: '/v1' });
  await app.register(ssePlugin, { prefix: '/v1' });
  await app.register(messagesPlugin, { prefix: '/v1' });
  await app.register(notificationPlugin, { prefix: '/v1' });

  return app;
}

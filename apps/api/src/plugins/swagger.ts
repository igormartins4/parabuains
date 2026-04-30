import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Parabuains API',
        description: 'Birthday social platform API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Development' }],
      tags: [
        { name: 'health', description: 'Infrastructure health' },
        { name: 'users', description: 'User management' },
        { name: 'friendships', description: 'Social connections' },
        { name: 'messages', description: 'Wall messages' },
        { name: 'notifications', description: 'Notification management' },
      ],
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: false },
    });
  }
});

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const routeConfig = (request.routeOptions?.config as unknown as Record<string, unknown> | undefined);
    if (routeConfig?.skipAuth) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Missing authorization token' });
    }

    try {
      await request.jwtVerify();
    } catch (err) {
      request.log.warn({ err }, 'JWT verification failed');
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  fastify.decorateRequest('userId', null);
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const routeConfig = (request.routeOptions?.config as unknown as Record<string, unknown> | undefined);
    if (routeConfig?.skipAuth) return;
    const payload = request.user as { sub?: string } | undefined;
    (request as FastifyRequest & { userId: string | null }).userId = payload?.sub ?? null;
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['@fastify/jwt'],
});

declare module 'fastify' {
  interface FastifyRequest { userId: string | null; }
}

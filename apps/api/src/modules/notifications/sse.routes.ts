import type { FastifyInstance } from 'fastify';
import IORedis from 'ioredis';
import { AppError } from '../../errors.js';

export async function sseRoutes(fastify: FastifyInstance) {
  // Error handler for AppError instances
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    reply.send(error);
  });

  // GET /notifications/stream — SSE para notificações in-app
  fastify.get('/notifications/stream', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const userId = request.userId;

    // Configurar headers SSE
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // para Nginx
    reply.raw.flushHeaders();

    // Conexão Redis subscriber dedicada para este cliente
    const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    const subscriber = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      reconnectOnError: () => true,
    });

    await subscriber.connect();

    const channel = `user:${userId}:events`;

    // Handler de mensagem
    const onMessage = (chan: string, message: string) => {
      if (chan === channel) {
        try {
          reply.raw.write(`data: ${message}\n\n`);
        } catch {
          // Conexão fechada — cleanup tratado por socket close event
        }
      }
    };
    subscriber.on('message', onMessage);
    await subscriber.subscribe(channel);

    // Heartbeat a cada 30 segundos
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(': heartbeat\n\n');
      } catch {
        // Conexão fechada
      }
    }, 30_000);

    // Timeout após 5 minutos — cliente deve reconectar
    const timeout = setTimeout(() => {
      reply.raw.end();
    }, 5 * 60 * 1000);

    // Cleanup ao fechar conexão
    const cleanup = async () => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      subscriber.removeListener('message', onMessage);
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      } catch {
        // Ignore errors during cleanup
      }
    };

    request.socket.on('close', cleanup);
    request.socket.on('error', cleanup);

    // Manter a requisição aberta (não retornar)
    await new Promise<void>((resolve) => {
      request.socket.on('close', resolve);
    });
  });
}

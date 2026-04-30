import type { FastifyInstance } from 'fastify';
import { AppError } from '../../errors.js';
import { AuditRepository } from './audit.repository.js';

export async function auditRoutes(fastify: FastifyInstance) {
  const repo = new AuditRepository();

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    reply.send(error);
  });

  /**
   * GET /v1/users/me/audit-log
   * Retorna audit log do usuário autenticado (últimos 90 dias), paginado.
   */
  fastify.get('/users/me/audit-log', async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);
    const offset = parseInt(query.offset ?? '0', 10);

    const logs = await repo.findByActor(request.userId, { limit, offset });
    return reply.send({ logs, limit, offset });
  });
}

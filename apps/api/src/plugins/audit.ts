import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { AuditRepository } from '../modules/audit/audit.repository.js';

declare module 'fastify' {
  interface FastifyInstance {
    auditRepo: AuditRepository;
  }
  interface FastifyRequest {
    auditAction: string | null;
    auditResource: string | null;
    auditMetadata: Record<string, unknown> | null;
  }
}

export const auditPlugin = fp(async (fastify: FastifyInstance) => {
  const auditRepo = new AuditRepository();
  fastify.decorate('auditRepo', auditRepo);

  fastify.decorateRequest('auditAction', null);
  fastify.decorateRequest('auditResource', null);
  fastify.decorateRequest('auditMetadata', null);

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (!request.auditAction) return payload;
    // Somente logar operações bem-sucedidas (2xx)
    if (reply.statusCode >= 400) return payload;

    try {
      await auditRepo.insert({
        actorId: request.userId ?? null,
        action: request.auditAction,
        resource: request.auditResource ?? null,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        metadata: request.auditMetadata ?? null,
      });
    } catch (err) {
      // Falha no audit log NÃO deve quebrar a resposta ao cliente
      fastify.log.error({ err, action: request.auditAction }, 'audit log insert failed');
    }

    return payload;
  });
}, {
  name: 'audit-plugin',
});

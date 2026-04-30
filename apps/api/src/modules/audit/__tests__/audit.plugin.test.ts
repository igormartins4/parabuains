import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock the AuditRepository
const insertMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../audit.repository.js', () => ({
  AuditRepository: vi.fn().mockImplementation(() => ({ insert: insertMock })),
}));

// Need to import AFTER mocking
const { auditPlugin } = await import('../../../plugins/audit.js');

describe('auditPlugin', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue(undefined);
    app = Fastify({ logger: false });
    await app.register(auditPlugin);

    // Rota de teste com auditAction
    app.post('/test-audit', async (request: FastifyRequest) => {
      request.auditAction = 'user.login';
      request.auditMetadata = { email: 'test@example.com' };
      return { ok: true };
    });

    // Rota que retorna 401
    app.post('/test-fail', async (request: FastifyRequest, reply: FastifyReply) => {
      request.auditAction = 'user.login';
      reply.code(401);
      return { error: 'Unauthorized' };
    });

    // Rota sem auditAction
    app.get('/test-no-audit', async () => ({ ok: true }));

    // Rota com userId explícito
    app.post('/test-with-user', async (request: FastifyRequest) => {
      (request as FastifyRequest & { userId: string }).userId = 'user-abc';
      request.auditAction = 'user.profile_update';
      request.auditResource = 'user:user-abc';
      return { ok: true };
    });

    await app.ready();
  });

  it('insere audit record para acao bem-sucedida (2xx)', async () => {
    const res = await app.inject({ method: 'POST', url: '/test-audit' });
    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.login' }),
    );
  });

  it('NAO insere audit record quando statusCode >= 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/test-fail' });
    expect(res.statusCode).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('NAO insere audit record quando auditAction nao esta definido', async () => {
    await app.inject({ method: 'GET', url: '/test-no-audit' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('nao quebra a resposta se insert falhar (resiliencia)', async () => {
    insertMock.mockRejectedValue(new Error('DB connection lost'));
    const res = await app.inject({ method: 'POST', url: '/test-audit' });
    expect(res.statusCode).toBe(200); // resposta não deve ser afetada
  });

  it('insere audit record com userId do request', async () => {
    await app.inject({ method: 'POST', url: '/test-with-user' });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-abc',
        action: 'user.profile_update',
        resource: 'user:user-abc',
      }),
    );
  });
});

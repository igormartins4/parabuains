import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditRepository } from '../audit.repository.js';

// Mock getDb to avoid real DB connection
vi.mock('../../../infrastructure/db.js', () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue([]),
};

describe('AuditRepository', () => {
  let repo: AuditRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks
    mockDb.insert.mockReturnThis();
    mockDb.values.mockResolvedValue(undefined);
    mockDb.delete.mockReturnThis();
    mockDb.where.mockResolvedValue({ rowCount: 0 });
    repo = new AuditRepository();
  });

  describe('insert', () => {
    it('insere um audit log com todos os campos', async () => {
      await repo.insert({
        actorId: 'user-123',
        action: 'user.login',
        resource: 'user:user-123',
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
        metadata: { email: 'test@example.com' },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-123',
          action: 'user.login',
          resource: 'user:user-123',
          ipAddress: '1.2.3.4',
        }),
      );
    });

    it('insere com actorId null quando nao autenticado', async () => {
      await repo.insert({ action: 'user.register' });
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: null, action: 'user.register' }),
      );
    });

    it('normaliza campos opcionais para null quando omitidos', async () => {
      await repo.insert({ action: 'user.login' });
      const callArg = mockDb.values.mock.calls[0]?.[0];
      expect(callArg).toMatchObject({
        actorId: null,
        resource: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      });
    });
  });

  describe('deleteBefore', () => {
    it('deleta registros mais antigos que a data cutoff', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 42 });
      const cutoff = new Date('2026-01-01');
      const count = await repo.deleteBefore(cutoff);
      expect(count).toBe(42);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('retorna 0 quando nenhum registro e deletado', async () => {
      mockDb.where.mockResolvedValue({ rowCount: 0 });
      const count = await repo.deleteBefore(new Date());
      expect(count).toBe(0);
    });

    it('retorna 0 quando rowCount e null (driver sem suporte)', async () => {
      mockDb.where.mockResolvedValue({ rowCount: null });
      const count = await repo.deleteBefore(new Date());
      expect(count).toBe(0);
    });
  });
});

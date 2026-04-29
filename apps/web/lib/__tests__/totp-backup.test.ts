import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock do banco
const mockDelete = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockResolvedValue(undefined);
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();

vi.mock('@/lib/db', () => ({
  db: {
    delete: mockDelete,
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  },
}));

vi.mock('@parabuains/db/schema', () => ({
  totpBackupCodes: { userId: 'userId', id: 'id', usedAt: 'usedAt', codeHash: 'codeHash' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

describe('generateBackupCodes', () => {
  it('gera exatamente 8 codigos', async () => {
    const { generateBackupCodes } = await import('@/lib/totp-backup');
    const { plainCodes, hashedCodes } = await generateBackupCodes('user-123');
    expect(plainCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);
  });

  it('cada codigo tem 10 caracteres', async () => {
    const { generateBackupCodes } = await import('@/lib/totp-backup');
    const { plainCodes } = await generateBackupCodes('user-123');
    for (const code of plainCodes) {
      expect(code).toHaveLength(10);
    }
  });

  it('codigos sao unicos', async () => {
    const { generateBackupCodes } = await import('@/lib/totp-backup');
    const { plainCodes } = await generateBackupCodes('user-123');
    const unique = new Set(plainCodes);
    expect(unique.size).toBe(8);
  });

  it('hashes sao validos bcrypt', async () => {
    const { generateBackupCodes } = await import('@/lib/totp-backup');
    const { plainCodes, hashedCodes } = await generateBackupCodes('user-123');
    for (let i = 0; i < 8; i++) {
      expect(hashedCodes[i]).not.toBe(plainCodes[i]);
      const isValid = await bcrypt.compare(plainCodes[i], hashedCodes[i]);
      expect(isValid).toBe(true);
    }
  });
});

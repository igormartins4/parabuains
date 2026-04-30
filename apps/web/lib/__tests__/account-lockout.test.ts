import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTtl = vi.fn();
const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    ttl: mockTtl,
    incr: mockIncr,
    expire: mockExpire,
    set: mockSet,
    del: mockDel,
  })),
}));

describe('isAccountLocked', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna locked:false quando chave nao existe (ttl=-2)', async () => {
    mockTtl.mockResolvedValue(-2);
    const { isAccountLocked } = await import('@/lib/account-lockout');
    expect((await isAccountLocked('user@example.com')).locked).toBe(false);
  });

  it('retorna locked:true com ttl quando lockout ativo', async () => {
    mockTtl.mockResolvedValue(1200);
    const { isAccountLocked } = await import('@/lib/account-lockout');
    const result = await isAccountLocked('user@example.com');
    expect(result.locked).toBe(true);
    expect(result.ttl).toBe(1200);
  });

  it('fail open: retorna locked:false quando Redis lanca erro', async () => {
    mockTtl.mockRejectedValue(new Error('Connection refused'));
    const { isAccountLocked } = await import('@/lib/account-lockout');
    expect((await isAccountLocked('user@example.com')).locked).toBe(false);
  });
});

describe('recordFailedAttempt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('incrementa e retorna tentativas sem lockout (< 10)', async () => {
    mockIncr.mockResolvedValue(3);
    mockExpire.mockResolvedValue(1);
    const { recordFailedAttempt } = await import('@/lib/account-lockout');
    const result = await recordFailedAttempt('user@example.com');
    expect(result.attempts).toBe(3);
    expect(result.locked).toBe(false);
  });

  it('aplica lockout ao atingir 10 tentativas', async () => {
    mockIncr.mockResolvedValue(10);
    mockSet.mockResolvedValue('OK');
    mockDel.mockResolvedValue(1);
    const { recordFailedAttempt } = await import('@/lib/account-lockout');
    const result = await recordFailedAttempt('user@example.com');
    expect(result.locked).toBe(true);
    expect(mockSet).toHaveBeenCalled();
  });
});

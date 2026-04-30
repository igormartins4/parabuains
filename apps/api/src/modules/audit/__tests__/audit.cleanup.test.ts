import { describe, expect, it, vi } from 'vitest';
import { cleanupAuditLogs } from '../audit.cleanup.js';

describe('cleanupAuditLogs', () => {
  it('deleta em batches ate nao haver mais rows', async () => {
    const deleteBefore = vi
      .fn()
      .mockResolvedValueOnce(1000) // primeiro batch: cheio
      .mockResolvedValueOnce(500) // segundo batch: último
      .mockResolvedValue(0);

    const mockRepo = { deleteBefore } as any;
    const logFn = vi.fn();

    const result = await cleanupAuditLogs(logFn, mockRepo);

    expect(deleteBefore).toHaveBeenCalledTimes(2);
    expect(result.deleted).toBe(1500);
    expect(logFn).toHaveBeenCalledTimes(2);
  });

  it('retorna 0 quando nao ha rows a deletar', async () => {
    const deleteBefore = vi.fn().mockResolvedValue(0);
    const mockRepo = { deleteBefore } as any;

    const result = await cleanupAuditLogs(vi.fn(), mockRepo);

    expect(deleteBefore).toHaveBeenCalledTimes(1);
    expect(result.deleted).toBe(0);
  });

  it('passa cutoff de 90 dias atras', async () => {
    const deleteBefore = vi.fn().mockResolvedValue(0);
    const mockRepo = { deleteBefore } as any;
    const before = Date.now();

    await cleanupAuditLogs(vi.fn(), mockRepo);

    const after = Date.now();
    const cutoff: Date = deleteBefore.mock.calls[0]?.[0];
    const expectedMs = 90 * 24 * 60 * 60 * 1000;
    expect(before - cutoff.getTime()).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(after - cutoff.getTime()).toBeLessThanOrEqual(expectedMs + 1000);
  });

  it('nao executa segundo batch quando primeiro retorna menos que 1000', async () => {
    const deleteBefore = vi.fn().mockResolvedValue(999);
    const mockRepo = { deleteBefore } as any;

    const result = await cleanupAuditLogs(vi.fn(), mockRepo);

    expect(deleteBefore).toHaveBeenCalledTimes(1);
    expect(result.deleted).toBe(999);
  });
});

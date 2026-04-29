// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { decodeJwt } from 'jose';

beforeAll(() => {
  process.env.API_JWT_SECRET = 'test-secret-min-32-chars-long-enough!';
});

describe('createServiceToken', () => {
  it('gera JWT com 3 partes (header.payload.signature)', async () => {
    const { createServiceToken } = await import('@/lib/service-token');
    const token = await createServiceToken('user-123', 'session-456');
    expect(token.split('.')).toHaveLength(3);
  });

  it('payload contem sub, sessionId e exp em ~60s', async () => {
    const { createServiceToken } = await import('@/lib/service-token');
    const token = await createServiceToken('user-123', 'session-456');
    const payload = decodeJwt(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.sessionId).toBe('session-456');
    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now + 55);
    expect(payload.exp).toBeLessThanOrEqual(now + 65);
  });
});

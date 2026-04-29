import { describe, it, expect, vi } from 'vitest';

// Mock do modulo db para evitar conexao real
vi.mock('@/lib/db', () => ({
  db: {},
}));

// Mock do schema do banco
vi.mock('@parabuains/db/schema', () => ({
  user: {},
  session: {},
  account: {},
  verification: {},
  twoFactor: {},
}));

// Mock do better-auth
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    handler: vi.fn(),
    $Infer: { Session: { user: {} } },
  })),
}));

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => ({})),
}));

vi.mock('better-auth/plugins', () => ({
  twoFactor: vi.fn(() => ({})),
}));

vi.mock('@/lib/email', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

describe('auth configuration', () => {
  it('exports auth instance', async () => {
    const { auth } = await import('@/lib/auth');
    expect(auth).toBeDefined();
  });

  it('exports Session and User types (module loads without error)', async () => {
    const module = await import('@/lib/auth');
    expect(module).toHaveProperty('auth');
  });
});

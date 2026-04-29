import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();
vi.mock('@/lib/resend', () => ({
  resend: { emails: { send: mockSend } },
  FROM_EMAIL: 'noreply@parabuains.com',
}));

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('envia email de verificacao com sucesso', async () => {
    mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });
    const { sendVerificationEmail } = await import('@/lib/email');
    await expect(
      sendVerificationEmail({ to: 'user@example.com', url: 'https://parabuains.com/verify?token=abc' })
    ).resolves.not.toThrow();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('Verifique'),
      })
    );
  });

  it('lanca erro se Resend retorna erro', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API Error' } });
    const { sendVerificationEmail } = await import('@/lib/email');
    await expect(
      sendVerificationEmail({ to: 'user@example.com', url: 'https://parabuains.com/verify?token=abc' })
    ).rejects.toThrow('Failed to send verification email');
  });
});

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('envia email de reset com sucesso', async () => {
    mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });
    const { sendPasswordResetEmail } = await import('@/lib/email');
    await expect(
      sendPasswordResetEmail({ to: 'user@example.com', url: 'https://parabuains.com/reset?token=xyz' })
    ).resolves.not.toThrow();
  });

  it('lanca erro se Resend retorna erro', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Rate limited' } });
    const { sendPasswordResetEmail } = await import('@/lib/email');
    await expect(
      sendPasswordResetEmail({ to: 'user@example.com', url: 'https://parabuains.com/reset?token=xyz' })
    ).rejects.toThrow('Failed to send password reset email');
  });
});

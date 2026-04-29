import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoogleSignInButton } from '../GoogleSignInButton';

vi.mock('@/lib/auth-client', () => ({
  signIn: { social: vi.fn() },
}));

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza botao com texto correto', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole('button', { name: /entrar com google/i })).toBeDefined();
  });

  it('botao nao esta desabilitado por padrao', () => {
    render(<GoogleSignInButton />);
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock next/headers (server-only)
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock auth — unauthenticated by default
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Import after mocks
const { default: HomePage } = await import('../../app/page.js');

describe('HomePage (unauthenticated)', () => {
  it('renders the Parabuains heading', async () => {
    render(await HomePage());
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Parabuains/)).toBeInTheDocument();
  });

  it('renders CTA links', async () => {
    render(await HomePage());
    expect(screen.getByRole('link', { name: /Criar conta/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /Entrar/i })).toHaveAttribute('href', '/login');
  });
});

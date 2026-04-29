import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page.js';

describe('HomePage', () => {
  it('renders the Parabuains heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Parabuains/)).toBeInTheDocument();
  });

  it('renders the birthday emoji', () => {
    render(<HomePage />);
    expect(screen.getByText(/🎂/)).toBeInTheDocument();
  });
});

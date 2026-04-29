import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Google OAuth configuration', () => {
  it('auth.ts contem socialProviders.google', () => {
    const content = readFileSync(resolve('./lib/auth.ts'), 'utf8');
    expect(content).toContain('google:');
    expect(content).toContain('clientId: process.env.GOOGLE_CLIENT_ID');
    expect(content).toContain('GOOGLE_CLIENT_SECRET');
  });

  it('auth.ts tem account linking habilitado', () => {
    const content = readFileSync(resolve('./lib/auth.ts'), 'utf8');
    expect(content).toContain('accountLinking');
    expect(content).toContain('trustedProviders');
    expect(content).toContain("'google'");
  });
});

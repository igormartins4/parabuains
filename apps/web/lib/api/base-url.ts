/**
 * Returns the base URL for internal API calls.
 * - Empty string in browser (relative URLs work fine)
 * - Absolute URL on server (needed for SSR fetches)
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

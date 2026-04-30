import { headers } from 'next/headers';
import { auth } from './auth';
import { createServiceToken } from './service-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type FetchOptions = RequestInit & { authenticated?: boolean };

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { authenticated = true, ...fetchOptions } = options;
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };
  if (authenticated) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error('Unauthenticated: no active session');
    const token = await createServiceToken(session.user.id, session.session.id);
    reqHeaders.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers: reqHeaders });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error((error as { message?: string }).message ?? `API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

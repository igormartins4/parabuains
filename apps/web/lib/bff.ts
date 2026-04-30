import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceToken } from '@/lib/service-token';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

export async function bffProxy(
  request: NextRequest,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceToken = await createServiceToken(session.user.id, session.session.id);

  const url = new URL(path, INTERNAL_API_URL);

  // Preserve query params from original request
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const method = options.method ?? request.method;
  const body =
    options.body ??
    (method !== 'GET' && method !== 'DELETE'
      ? await request.json().catch(() => undefined)
      : undefined);

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

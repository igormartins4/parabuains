import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { createServiceToken } from '@/lib/service-token';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const serviceToken = await createServiceToken(session.user.id, session.session.id);
  const apiUrl = `${process.env.INTERNAL_API_URL ?? 'http://localhost:3001'}/v1/notifications/stream`;

  const upstream = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${serviceToken}`,
      Accept: 'text/event-stream',
    },
  });

  // Proxy SSE stream transparently
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

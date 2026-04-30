import { type NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

/**
 * POST /api/push/subscribe
 * Proxy to Fastify POST /v1/push-subscriptions
 */
export async function POST(request: NextRequest) {
  return bffProxy(request, '/v1/push-subscriptions', { method: 'POST' });
}

/**
 * DELETE /api/push/subscribe
 * Proxy to Fastify DELETE /v1/push-subscriptions/:endpoint
 * Reads the endpoint from the request body, URL-encodes it for the path.
 */
export async function DELETE(request: NextRequest) {
  let endpoint: string;
  try {
    const body = (await request.json()) as { endpoint: string };
    endpoint = body.endpoint;
  } catch {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'Missing endpoint in body' }, { status: 400 });
  }

  const encodedEndpoint = encodeURIComponent(endpoint);
  return bffProxy(request, `/v1/push-subscriptions/${encodedEndpoint}`, { method: 'DELETE' });
}

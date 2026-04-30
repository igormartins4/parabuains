import { type NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

/**
 * GET /api/notifications/preferences
 * Proxy to Fastify GET /v1/users/me/notification-preferences
 */
export async function GET(request: NextRequest) {
  return bffProxy(request, '/v1/users/me/notification-preferences', { method: 'GET' });
}

/**
 * PUT /api/notifications/preferences
 * Proxy to Fastify PUT /v1/users/me/notification-preferences
 */
export async function PUT(request: NextRequest) {
  return bffProxy(request, '/v1/users/me/notification-preferences', { method: 'PUT' });
}

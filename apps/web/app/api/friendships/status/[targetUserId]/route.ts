import type { NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

export const GET = (req: NextRequest, { params }: { params: Promise<{ targetUserId: string }> }) =>
  params.then(({ targetUserId }) => bffProxy(req, `/v1/friendships/status/${targetUserId}`));

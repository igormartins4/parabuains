import type { NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

export const POST = (req: NextRequest, { params }: { params: Promise<{ id: string }> }) =>
  params.then(({ id }) => bffProxy(req, `/v1/messages/${encodeURIComponent(id)}/report`));

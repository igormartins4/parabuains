import { type NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

export const POST = (
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) =>
  params.then(({ username }) =>
    bffProxy(req, `/v1/users/${encodeURIComponent(username)}/wall`),
  );

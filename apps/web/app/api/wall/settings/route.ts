import { type NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

export const PUT = (req: NextRequest) => bffProxy(req, '/v1/users/me/wall/settings');

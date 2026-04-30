import { type NextRequest } from 'next/server';
import { bffProxy } from '@/lib/bff';

export const GET = (req: NextRequest) => bffProxy(req, '/v1/users/search');

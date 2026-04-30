import { TextEncoder } from 'node:util';
import { SignJWT } from 'jose';

const SECRET = process.env.API_JWT_SECRET;
const TOKEN_TTL_SECONDS = 60;

if (!SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('API_JWT_SECRET must be set in production');
  }
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn('[service-token] API_JWT_SECRET not set — using insecure dev fallback');
  }
}

const EFFECTIVE_SECRET = SECRET ?? 'dev-secret-change-in-production-min-32-chars!!';

export async function createServiceToken(userId: string, sessionId: string): Promise<string> {
  const secret = new TextEncoder().encode(EFFECTIVE_SECRET);
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

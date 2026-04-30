import { TextEncoder } from 'node:util';
import { SignJWT } from 'jose';

const TOKEN_TTL_SECONDS = 60;
const DEV_FALLBACK_SECRET = 'dev-secret-change-in-production-min-32-chars!!';

function getEffectiveSecret(): string {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('API_JWT_SECRET must be set in production');
    }
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[service-token] API_JWT_SECRET not set — using insecure dev fallback');
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

export async function createServiceToken(userId: string, sessionId: string): Promise<string> {
  const secret = new TextEncoder().encode(getEffectiveSecret());
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

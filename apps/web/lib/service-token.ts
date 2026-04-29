import { SignJWT } from 'jose';
import { TextEncoder } from 'util';

const SECRET = process.env.API_JWT_SECRET;
const TOKEN_TTL_SECONDS = 60;

if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('API_JWT_SECRET must be set in production');
}

export async function createServiceToken(userId: string, sessionId: string): Promise<string> {
  const secret = new TextEncoder().encode(SECRET ?? 'dev-secret-change-in-production');
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

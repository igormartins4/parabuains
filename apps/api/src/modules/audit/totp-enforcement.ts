import { getDb } from '../../infrastructure/db.js';
import { users } from '@parabuains/db';
import { eq } from 'drizzle-orm';
import { TotpRequiredError } from '../../errors.js';

/**
 * 2FA Enforcement Middleware
 *
 * For sensitive operations (username change, account settings), check if the user
 * has 2FA enabled. If so, require the X-2FA-Verified: true header, which is set
 * by the BFF after successful TOTP verification.
 *
 * This is a defense-in-depth check — the actual TOTP verification happens in better-auth.
 */
export async function require2FAIfEnabled(
  userId: string,
  twoFaVerifiedHeader: string | undefined,
): Promise<void> {
  const db = getDb();
  const [user] = await db
    .select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;
  if (!user.totpEnabled) return; // 2FA not active — skip check

  // If 2FA is enabled, require verified header from BFF
  if (twoFaVerifiedHeader !== 'true') {
    throw new TotpRequiredError();
  }
}

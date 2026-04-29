import { db } from './db';
import { totpBackupCodes } from '@parabuains/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 10;
const BCRYPT_COST = 12;

export async function generateBackupCodes(userId: string): Promise<{
  plainCodes: string[];
  hashedCodes: string[];
}> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = randomBytes(Math.ceil(BACKUP_CODE_LENGTH / 2))
      .toString('hex')
      .slice(0, BACKUP_CODE_LENGTH)
      .toUpperCase();
    plainCodes.push(code);
    hashedCodes.push(await bcrypt.hash(code, BCRYPT_COST));
  }

  return { plainCodes, hashedCodes };
}

export async function storeBackupCodes(userId: string, hashedCodes: string[]): Promise<void> {
  await db.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
  await db.insert(totpBackupCodes).values(
    hashedCodes.map((codeHash) => ({ userId, codeHash }))
  );
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const unusedCodes = await db
    .select()
    .from(totpBackupCodes)
    .where(and(eq(totpBackupCodes.userId, userId), isNull(totpBackupCodes.usedAt)));

  for (const row of unusedCodes) {
    const isValid = await bcrypt.compare(code.toUpperCase(), row.codeHash);
    if (isValid) {
      await db
        .update(totpBackupCodes)
        .set({ usedAt: new Date() })
        .where(eq(totpBackupCodes.id, row.id));
      return true;
    }
  }

  return false;
}

export async function countRemainingBackupCodes(userId: string): Promise<number> {
  const codes = await db
    .select({ id: totpBackupCodes.id })
    .from(totpBackupCodes)
    .where(and(eq(totpBackupCodes.userId, userId), isNull(totpBackupCodes.usedAt)));
  return codes.length;
}

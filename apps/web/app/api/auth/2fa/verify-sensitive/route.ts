import { auth } from '@/lib/auth';
import { verifyBackupCode } from '@/lib/totp-backup';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.twoFactorEnabled) {
    return NextResponse.json({ verified: true });
  }

  const { code } = await request.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  const sanitizedCode = code.trim().replace(/[\s-]/g, '');
  if (sanitizedCode.length === 10) {
    const isBackupCodeValid = await verifyBackupCode(session.user.id, sanitizedCode);
    if (isBackupCodeValid) {
      return NextResponse.json({ verified: true, usedBackupCode: true });
    }
  }

  try {
    const result = await auth.api.verifyTOTP({
      headers: request.headers,
      body: { code: sanitizedCode },
    });
    return NextResponse.json({ verified: result.status });
  } catch {
    return NextResponse.json({ verified: false, error: 'Invalid code' }, { status: 400 });
  }
}

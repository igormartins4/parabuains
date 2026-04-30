import { type NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { auth } from '@/lib/auth';
import { generateBackupCodes, storeBackupCodes } from '@/lib/totp-backup';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totpSetup = await auth.api.enableTwoFactor({
      headers: request.headers,
      body: await request.json(),
    });

    const qrCodeDataUrl = await QRCode.toDataURL(totpSetup.totpURI, {
      errorCorrectionLevel: 'M',
      width: 256,
    });

    const { plainCodes, hashedCodes } = await generateBackupCodes(session.user.id);
    await storeBackupCodes(session.user.id, hashedCodes);

    return NextResponse.json({
      totpURI: totpSetup.totpURI,
      qrCodeDataUrl,
      backupCodes: plainCodes,
    });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { mimeType, fileSize } = body;

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
      { status: 400 },
    );
  }

  if (!fileSize || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 },
    );
  }

  const serviceToken = await createServiceToken(session.user.id, session.session.id);

  const apiResponse = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/users/me/avatar-url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({ mimeType, fileSize }),
    },
  );

  if (!apiResponse.ok) {
    const error = await apiResponse.json().catch(() => ({}));
    return NextResponse.json(error, { status: apiResponse.status });
  }

  const data = await apiResponse.json();
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

function getR2Client() {
  return new S3Client({
    endpoint: process.env.R2_ENDPOINT!,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const R2_BUCKET = process.env.R2_BUCKET_NAME ?? 'parabuains';

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { uploadKey } = await req.json();
  if (!uploadKey || typeof uploadKey !== 'string') {
    return NextResponse.json({ error: 'uploadKey is required' }, { status: 400 });
  }

  const r2 = getR2Client();

  // 1. Download raw uploaded file from R2
  const getCommand = new GetObjectCommand({ Bucket: R2_BUCKET, Key: uploadKey });
  const rawObject = await r2.send(getCommand);

  if (!rawObject.Body) {
    return NextResponse.json({ error: 'Failed to retrieve uploaded file' }, { status: 500 });
  }

  const rawBuffer = await streamToBuffer(rawObject.Body as unknown as ReadableStream);

  // 2. Process with Sharp: resize 400x400, convert to WebP, strip EXIF
  const processedBuffer = await sharp(rawBuffer)
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .withMetadata(false)
    .toBuffer();

  // 3. Upload processed file to canonical path
  const finalKey = `avatars/${session.user.id}/avatar.webp`;
  const putCommand = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: finalKey,
    Body: processedBuffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=3600',
  });
  await r2.send(putCommand);

  // 4. Notify Fastify API to update avatar_url in DB
  const serviceToken = await createServiceToken(session.user.id, session.session.id);
  const apiResponse = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/users/me/avatar-confirm`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({}),
    },
  );

  if (!apiResponse.ok) {
    return NextResponse.json({ error: 'Failed to update avatar in database' }, { status: 500 });
  }

  const data = await apiResponse.json();
  return NextResponse.json(data);
}

import { S3Client } from '@aws-sdk/client-s3';

// Lazy init — skip at import time to avoid crashing in tests
function createR2Client() {
  if (!process.env.R2_ENDPOINT) throw new Error('R2_ENDPOINT is required');
  if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is required');
  if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is required');

  return new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2Client) _r2Client = createR2Client();
  return _r2Client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? 'parabuains';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from '../../lib/r2.js';
import { BadRequestError } from '../../errors.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class AvatarService {
  async generateUploadUrl(
    userId: string,
    mimeType: string,
    fileSize: number,
  ): Promise<{ uploadUrl: string; key: string }> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestError(
        `Invalid MIME type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError(
        `File size ${fileSize} exceeds maximum of ${MAX_FILE_SIZE_BYTES} bytes (5MB)`,
      );
    }

    const key = `avatars/${userId}/temp-${Date.now()}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 }); // 5 minutes

    return { uploadUrl, key };
  }

  getAvatarPublicUrl(userId: string): string {
    return `${R2_PUBLIC_URL}/avatars/${userId}/avatar.webp`;
  }
}

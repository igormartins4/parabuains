const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export interface AvatarUploadResult {
  avatarUrl: string;
}

export class AvatarUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AvatarUploadError';
  }
}

/**
 * Orchestrates the full avatar upload flow:
 * 1. Validate file locally (MIME type + size)
 * 2. Request presigned URL from BFF
 * 3. Upload file directly to R2 via presigned URL
 * 4. Confirm upload to BFF (triggers Sharp processing)
 */
export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AvatarUploadError(
      `Invalid file type: ${file.type}. Please upload a JPEG, PNG, or WebP image.`,
      'INVALID_MIME',
    );
  }
  if (file.size > MAX_SIZE) {
    throw new AvatarUploadError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`,
      'FILE_TOO_LARGE',
    );
  }

  // Step 2: Request presigned URL from BFF
  const urlResponse = await fetch('/api/profile/avatar-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type, fileSize: file.size }),
  });

  if (!urlResponse.ok) {
    const error = await urlResponse.json();
    throw new AvatarUploadError(error.error ?? 'Failed to get upload URL', 'PRESIGN_FAILED');
  }

  const { uploadUrl, key } = (await urlResponse.json()) as { uploadUrl: string; key: string };

  // Step 3: Upload directly to R2
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!uploadResponse.ok) {
    throw new AvatarUploadError(
      'Failed to upload to storage. Please try again.',
      'R2_UPLOAD_FAILED',
    );
  }

  // Step 4: Confirm upload (triggers Sharp processing in BFF)
  const confirmResponse = await fetch('/api/profile/avatar-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadKey: key }),
  });

  if (!confirmResponse.ok) {
    throw new AvatarUploadError(
      'Upload succeeded but processing failed. Please try again.',
      'CONFIRM_FAILED',
    );
  }

  return confirmResponse.json() as Promise<AvatarUploadResult>;
}

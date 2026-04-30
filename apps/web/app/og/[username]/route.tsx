import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';
import { daysUntilBirthday } from '@/lib/birthday';

export const runtime = 'edge';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profile: any = null;
  try {
    const res = await fetch(
      `${process.env.INTERNAL_API_URL}/v1/users/${encodeURIComponent(username)}`,
    );
    if (res.ok) profile = await res.json();
  } catch {
    // fall through to default OG
  }

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
            fontFamily: 'sans-serif',
          }}
        >
          <span style={{ fontSize: 80 }}>🎂</span>
          <span
            style={{ fontSize: 48, marginLeft: 24, fontWeight: 700, color: '#be185d' }}
          >
            Parabuains
          </span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const days = profile.birthday
    ? daysUntilBirthday(profile.birthday, profile.timezone ?? 'America/Sao_Paulo')
    : null;

  const countdownText =
    days === null
      ? null
      : days === 0
        ? 'Hoje é aniversário! 🎉'
        : `${days} ${days === 1 ? 'dia' : 'dias'} para o aniversário`;

  // Fetch avatar — fall back to initials if it fails
  let avatarData: string | null = null;
  if (profile.avatarUrl) {
    try {
      const avatarRes = await fetch(profile.avatarUrl);
      if (avatarRes.ok) {
        const buffer = await avatarRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const mime = avatarRes.headers.get('content-type') ?? 'image/webp';
        avatarData = `data:${mime};base64,${base64}`;
      }
    } catch {
      // use initials fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
          fontFamily: 'sans-serif',
          gap: 24,
          padding: 64,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#f9a8d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid white',
          }}
        >
          {avatarData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarData}
              width={120}
              height={120}
              style={{ objectFit: 'cover' }}
              alt=""
            />
          ) : (
            <span style={{ fontSize: 56, fontWeight: 700, color: '#be185d' }}>
              {profile.displayName[0]?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Display name */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 48, fontWeight: 700, color: '#1f2937' }}>
            {profile.displayName}
          </span>
          <span style={{ fontSize: 24, color: '#6b7280' }}>@{profile.username}</span>
        </div>

        {/* Countdown */}
        {countdownText && (
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '16px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 32 }}>🎂</span>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#be185d' }}>
              {countdownText}
            </span>
          </div>
        )}

        {/* Branding */}
        <span
          style={{ position: 'absolute', bottom: 32, fontSize: 20, color: '#9ca3af' }}
        >
          parabuains.com
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}


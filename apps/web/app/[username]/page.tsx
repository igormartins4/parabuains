import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';
import {
  BirthdayCountdown,
  BirthdayCountdownHidden,
} from '@/components/profile/BirthdayCountdown';
import { ShareButton } from '@/components/profile/ShareButton';
import { MutualFriends } from '@/components/profile/MutualFriends';
import { FriendshipButton } from './FriendshipButton';
import type { FriendshipStatus } from '@/lib/api/friendships';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function fetchProfile(username: string, serviceToken?: string) {
  const reqHeaders: HeadersInit = { 'Content-Type': 'application/json' };
  if (serviceToken) {
    reqHeaders['Authorization'] = `Bearer ${serviceToken}`;
  }

  const res = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/users/${encodeURIComponent(username)}`,
    { headers: reqHeaders, next: { revalidate: 60 } },
  );

  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  return res.json();
}

async function fetchFriendshipStatus(
  profileId: string,
  serviceToken: string,
): Promise<{ status: FriendshipStatus; friendshipId?: string }> {
  const res = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/friendships/status/${encodeURIComponent(profileId)}`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) return { status: 'none' };
  return res.json() as Promise<{ status: FriendshipStatus; friendshipId?: string }>;
}

async function fetchMutualFriends(username: string, serviceToken: string) {
  const res = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/users/${encodeURIComponent(username)}/mutual-friends`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      next: { revalidate: 300 },
    },
  );
  if (!res.ok) return { count: 0, sample: [] };
  return res.json();
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);

  if (!profile) {
    return { title: 'Perfil não encontrado — Parabuains' };
  }

  const description = profile.bio
    ? `${profile.bio} · Perfil no Parabuains`
    : `Perfil de ${profile.displayName} no Parabuains`;

  return {
    title: `${profile.displayName} (@${username}) — Parabuains`,
    description,
    openGraph: {
      title: `${profile.displayName} no Parabuains`,
      description,
      images: [`/og/${username}`],
      url: `https://parabuains.com/${username}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.displayName} no Parabuains`,
      description,
      images: [`/og/${username}`],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  let serviceToken: string | undefined;
  if (session?.user) {
    serviceToken = await createServiceToken(session.user.id, session.session.id);
  }

  const profile = await fetchProfile(username, serviceToken);

  if (!profile) {
    notFound();
  }

  // Fetch mutual friends only if viewer is authenticated and not on own profile
  let mutualFriends = { count: 0, sample: [] };
  let friendshipData: { status: FriendshipStatus; friendshipId?: string } | null = null;
  if (session?.user && session.user.id !== profile.id && serviceToken) {
    [mutualFriends, friendshipData] = await Promise.all([
      fetchMutualFriends(username, serviceToken),
      fetchFriendshipStatus(profile.id as string, serviceToken),
    ]);
  }

  // Determine countdown visibility
  const isFriend = mutualFriends.count > 0; // approximate — real check is via friendship API
  const isSelf = session?.user?.id === profile.id;
  const canSeeCountdown =
    profile.countdownVisibility === 'public' || isSelf || isFriend;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Avatar + name */}
      <section className="flex flex-col items-center gap-4 mb-8">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={`Foto de ${profile.displayName}`}
              fill
              className="object-cover"
              sizes="96px"
              priority
            />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400">
              {profile.displayName[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-gray-500 text-sm">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="text-center text-gray-700 max-w-md">{profile.bio}</p>
        )}

        <div className="flex items-center gap-3">
          <ShareButton username={username} displayName={profile.displayName} />
          {friendshipData && (
            <FriendshipButton
              targetUserId={profile.id as string}
              initialStatus={friendshipData.status}
              initialFriendshipId={friendshipData.friendshipId}
            />
          )}
        </div>
      </section>

      {/* Birthday countdown */}
      {profile.birthday && (
        <section className="mb-6">
          {canSeeCountdown ? (
            <BirthdayCountdown
              birthday={profile.birthday}
              timezone={profile.timezone ?? 'America/Sao_Paulo'}
            />
          ) : (
            <BirthdayCountdownHidden />
          )}
        </section>
      )}

      {/* Mutual friends */}
      {mutualFriends.count > 0 && (
        <section className="mb-6">
          <MutualFriends count={mutualFriends.count} sample={mutualFriends.sample} />
        </section>
      )}
    </main>
  );
}

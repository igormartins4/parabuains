import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';
import { WallSettingsForm } from './WallSettingsForm';

export const metadata: Metadata = { title: 'Configurações do Mural — Parabuains' };

async function fetchWallSettings(username: string, serviceToken: string) {
  const res = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/users/${encodeURIComponent(username)}`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  return res.json() as Promise<{
    wallWhoCanPost?: 'friends' | 'authenticated';
    wallAllowAnonymous?: boolean;
    wallRequireApproval?: boolean;
  }>;
}

export default async function WallSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/login');
  }

  const serviceToken = await createServiceToken(session.user.id, session.session.id);
  const username = (session.user as unknown as { username?: string }).username;

  if (!username) {
    redirect('/login');
  }

  const profile = await fetchWallSettings(username, serviceToken);

  const currentSettings = {
    wallWhoCanPost: profile?.wallWhoCanPost ?? ('friends' as const),
    wallAllowAnonymous: profile?.wallAllowAnonymous ?? true,
    wallRequireApproval: profile?.wallRequireApproval ?? false,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Configurações do Mural
      </h1>
      <WallSettingsForm initialSettings={currentSettings} />
    </main>
  );
}

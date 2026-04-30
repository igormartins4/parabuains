import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';
import { UsernameForm } from '@/components/settings/UsernameForm';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { BirthYearToggle } from '@/components/settings/BirthYearToggle';
import { AvatarUpload } from '@/components/settings/AvatarUpload';
import { updateProfileAction } from './actions';

export const metadata: Metadata = {
  title: 'Editar perfil — Parabuains',
  description: 'Gerencie as informações e privacidade do seu perfil',
};

async function fetchCurrentProfile(serviceToken: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  // Fetch the user's own profile via the public endpoint
  const username = (session.user as unknown as { username?: string }).username;
  if (!username) return null;

  const res = await fetch(
    `${process.env.INTERNAL_API_URL}/v1/users/${encodeURIComponent(username)}`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function ProfileSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/login');
  }

  const serviceToken = await createServiceToken(session.user.id, session.session.id);
  const profile = await fetchCurrentProfile(serviceToken);

  if (!profile) {
    redirect('/login');
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Editar perfil</h1>

      <div className="space-y-8">
        {/* Avatar */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Foto de perfil</h2>
          <AvatarUpload
            currentAvatarUrl={profile.avatarUrl}
            displayName={profile.displayName}
          />
        </section>

        {/* Basic info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Informações básicas</h2>
          {/* @ts-expect-error Server Action returns data but Next.js handles it correctly */}
          <form action={updateProfileAction} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome de exibição
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                defaultValue={profile.displayName}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                required
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={300}
                defaultValue={profile.bio ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                placeholder="Conte um pouco sobre você..."
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
            >
              Salvar informações
            </button>
          </form>
        </section>

        {/* Username */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Username</h2>
          <UsernameForm currentUsername={profile.username} />
        </section>

        {/* Privacy */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Privacidade</h2>
          <PrivacySettings
            privacyLevel={profile.privacyLevel}
            countdownVisibility={profile.countdownVisibility}
          />
        </section>

        {/* Birth year */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Aniversário</h2>
          <BirthYearToggle birthYearHidden={profile.birthYearHidden ?? true} />
        </section>
      </div>
    </main>
  );
}

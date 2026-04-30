import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';
import { NotificationsSettingsForm } from '@/components/notifications/NotificationsSettingsForm';

export const metadata: Metadata = { title: 'Configurações de Notificações — Parabuains' };

interface NotificationPreference {
  channel: 'email' | 'push';
  daysBefore: number[];
  enabled: boolean;
}

async function fetchNotificationPreferences(
  serviceToken: string,
): Promise<NotificationPreference[]> {
  try {
    const res = await fetch(
      `${process.env.INTERNAL_API_URL}/v1/users/me/notification-preferences`,
      {
        headers: { Authorization: `Bearer ${serviceToken}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { preferences?: NotificationPreference[] };
    return data.preferences ?? [];
  } catch {
    return [];
  }
}

export default async function NotificationsSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/login');
  }

  const serviceToken = await createServiceToken(session.user.id, session.session.id);
  const preferences = await fetchNotificationPreferences(serviceToken);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Notificações
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Escolha como e quando você quer ser notificado sobre aniversários dos seus amigos.
      </p>
      <NotificationsSettingsForm initialPreferences={preferences} />
    </main>
  );
}

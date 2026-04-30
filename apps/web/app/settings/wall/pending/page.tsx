import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPendingMessages } from '@/lib/api/messages';
import { auth } from '@/lib/auth';
import { PendingMessagesClient } from './PendingMessagesClient';

export const metadata: Metadata = { title: 'Aprovação de Mensagens — Parabuains' };

export default async function PendingMessagesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/login');
  }

  const pendingMessages = await getPendingMessages().catch(() => []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Mensagens Pendentes
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {pendingMessages.length} mensagem
            {pendingMessages.length !== 1 ? 's' : ''} aguardando aprovação
          </p>
        </div>
        <a
          href="/settings/wall"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Configurações do mural
        </a>
      </div>

      <PendingMessagesClient initialMessages={pendingMessages} />
    </main>
  );
}

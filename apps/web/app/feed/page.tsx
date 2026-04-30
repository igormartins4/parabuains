import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getBirthdayFeed } from '@/lib/api/feed';
import { BirthdayCard } from './BirthdayCard';
import { NotificationBadge } from './NotificationBadge';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Feed de Aniversários — Parabuains' };

async function FeedContent() {
  const feed = await getBirthdayFeed();

  if (feed.today.length === 0 && feed.upcoming.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500">
        <p className="text-4xl mb-4">🎉</p>
        <p className="font-medium">Nenhum aniversário nos próximos 30 dias.</p>
        <p className="text-sm mt-2">Adicione amigos para ver os aniversários deles aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {feed.today.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
            🎂 Aniversário Hoje
          </h2>
          <div className="space-y-2">
            {feed.today.map((entry) => (
              <BirthdayCard key={entry.userId} entry={entry} isToday />
            ))}
          </div>
        </section>
      )}
      {feed.upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-700 mb-3">Próximos 30 dias</h2>
          <div className="space-y-2">
            {feed.upcoming.map((entry) => (
              <BirthdayCard key={entry.userId} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Feed de Aniversários</h1>
        <NotificationBadge />
      </div>
      <Suspense
        fallback={
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list — index is stable and intentional
              <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <FeedContent />
      </Suspense>
    </main>
  );
}

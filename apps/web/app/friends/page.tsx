'use client';
import { useState } from 'react';
import { PendingRequests } from './PendingRequests';
import { UserSearch } from './UserSearch';

type Tab = 'friends' | 'pending' | 'search';

const TAB_LABELS: Record<Tab, string> = {
  friends: 'Amigos',
  pending: 'Pedidos',
  search: 'Buscar',
};

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Amigos</h1>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6">
        {(['friends', 'pending', 'search'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <p className="text-center text-neutral-500 py-8">
          Lista de amigos — a ser implementada.
        </p>
      )}
      {tab === 'pending' && <PendingRequests />}
      {tab === 'search' && <UserSearch />}
    </main>
  );
}

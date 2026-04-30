'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { WallMessageData } from '@/lib/api/messages';

interface PendingMessagesClientProps {
  initialMessages: WallMessageData[];
}

export function PendingMessagesClient({ initialMessages }: PendingMessagesClientProps) {
  const [messages, setMessages] = useState(initialMessages);

  async function handleApprove(messageId: string) {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}/approve`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch {
      alert('Erro ao aprovar mensagem.');
    }
  }

  async function handleReject(messageId: string) {
    if (!confirm('Rejeitar esta mensagem?')) return;
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reject`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch {
      alert('Erro ao rejeitar mensagem.');
    }
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-zinc-500 dark:text-zinc-400">Nenhuma mensagem pendente. Tudo em dia!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        // Display anonymous message safely — never reveal identity
        const displayName = message.isAnonymous
          ? 'Anônimo'
          : (message.author?.displayName ?? 'Usuário desconhecido');
        const avatarUrl = message.isAnonymous ? null : (message.author?.avatarUrl ?? null);

        return (
          <article
            key={message.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={`Avatar de ${displayName}`}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {message.isAnonymous ? '?' : displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {displayName}
                  </span>
                  {message.isAnonymous && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700">
                      Anônima
                    </span>
                  )}
                  {message.isPrivate && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700">
                      Privada
                    </span>
                  )}
                </div>

                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">
                  {message.content}
                </p>

                <time dateTime={message.createdAt} className="mt-1 block text-xs text-zinc-400">
                  {new Date(message.createdAt).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            </div>

            {/* Approval actions */}
            <div className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => handleApprove(message.id)}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => handleReject(message.id)}
                className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
              >
                Rejeitar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

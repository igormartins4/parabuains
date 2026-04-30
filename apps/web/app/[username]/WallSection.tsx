'use client';

import { useState } from 'react';
import type { WallMessageData } from '../../lib/api/messages';
import { ComposeMessageModal } from './ComposeMessageModal';

interface WallSectionProps {
  username: string;
  messages: WallMessageData[];
  currentUserId: string | null;
  profileOwnerId: string;
  wallAllowAnonymous: boolean;
  canPost: boolean; // pre-computed by server: respects wallWhoCanPost
}

interface MessageCardProps {
  message: WallMessageData;
  currentUserId: string | null;
  profileOwnerId: string;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
}

function MessageCard({
  message,
  currentUserId,
  profileOwnerId,
  onDelete,
  onReport,
}: MessageCardProps) {
  const isOwner = currentUserId === profileOwnerId;
  // Anonymous authors cannot delete their own message (identity hidden)
  const isAuthor = !message.isAnonymous && currentUserId === message.authorId;
  const canDelete = isOwner || isAuthor;
  // Users can report messages that are not theirs and not already reported
  const canReport = currentUserId !== null && !isOwner && !isAuthor;

  // CRITICAL: Never render real author info for anonymous messages
  const displayName = message.isAnonymous
    ? 'Anônimo'
    : (message.author?.displayName ?? 'Usuário');
  const avatarUrl = message.isAnonymous ? null : (message.author?.avatarUrl ?? null);
  const showAuthorLink = !message.isAnonymous && message.author;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar de ${displayName}`}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              aria-hidden="true"
            >
              {message.isAnonymous ? '?' : displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Author name */}
          <div className="flex items-center gap-2">
            {showAuthorLink ? (
              <a
                href={`/${message.author!.username}`}
                className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {displayName}
              </a>
            ) : (
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {displayName}
              </span>
            )}
            {message.isPrivate && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700">
                Privada
              </span>
            )}
          </div>

          {/* Message content */}
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">
            {message.content}
          </p>

          {/* Timestamp + actions */}
          <div className="mt-2 flex items-center gap-3">
            <time dateTime={message.createdAt} className="text-xs text-zinc-400">
              {new Date(message.createdAt).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>

            {canDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="text-xs text-red-500 hover:underline"
                aria-label="Deletar mensagem"
              >
                Deletar
              </button>
            )}

            {canReport && (
              <button
                onClick={() => onReport(message.id)}
                className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
                aria-label="Reportar mensagem"
              >
                Reportar
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function WallSection({
  username,
  messages: initialMessages,
  currentUserId,
  profileOwnerId,
  wallAllowAnonymous,
  canPost,
}: WallSectionProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [isComposing, setIsComposing] = useState(false);

  async function handleDelete(messageId: string) {
    if (!confirm('Deletar esta mensagem?')) return;
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch {
      alert('Erro ao deletar mensagem.');
    }
  }

  async function handleReport(messageId: string) {
    const reason = prompt('Motivo do report: spam, harassment, inappropriate, ou other');
    const validReasons = ['spam', 'harassment', 'inappropriate', 'other'];
    if (!reason || !validReasons.includes(reason)) return;

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        alert('Mensagem reportada. Obrigado!');
      }
    } catch {
      alert('Erro ao reportar mensagem.');
    }
  }

  function handleComposeSuccess() {
    setIsComposing(false);
    window.location.reload();
  }

  return (
    <section aria-labelledby="wall-section-title" className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="wall-section-title"
          className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Mural
        </h2>
        {canPost && currentUserId && (
          <button
            onClick={() => setIsComposing(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Escrever mensagem
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            Nenhuma mensagem ainda. Seja o primeiro a deixar uma mensagem!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              profileOwnerId={profileOwnerId}
              onDelete={handleDelete}
              onReport={handleReport}
            />
          ))}
        </div>
      )}

      {isComposing && (
        <ComposeMessageModal
          username={username}
          wallAllowAnonymous={wallAllowAnonymous}
          onClose={() => setIsComposing(false)}
          onSuccess={handleComposeSuccess}
        />
      )}
    </section>
  );
}

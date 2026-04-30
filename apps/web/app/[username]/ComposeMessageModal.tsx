'use client';

import { useRef, useState } from 'react';

interface ComposeMessageModalProps {
  username: string;
  wallAllowAnonymous: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_CHARS = 500;

const MESSAGE_TYPES = [
  { value: 'public', label: 'Pública', description: 'Visível para todos' },
  { value: 'private', label: 'Privada', description: 'Apenas para o aniversariante' },
  { value: 'anonymous', label: 'Anônima', description: 'Sem revelar sua identidade' },
] as const;

type MessageType = 'public' | 'private' | 'anonymous';

export function ComposeMessageModal({
  username,
  wallAllowAnonymous,
  onClose,
  onSuccess,
}: ComposeMessageModalProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<MessageType>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Honeypot ref — hidden from users, visible to bots
  const honeypotRef = useRef<HTMLInputElement>(null);

  const charsRemaining = MAX_CHARS - content.length;
  const isOverLimit = charsRemaining < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOverLimit || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/wall/${encodeURIComponent(username)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          type,
          // Include honeypot — server checks if filled
          website: honeypotRef.current?.value ?? '',
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Erro ao enviar mensagem');
        return;
      }

      onSuccess();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const availableTypes = wallAllowAnonymous
    ? MESSAGE_TYPES
    : MESSAGE_TYPES.filter((t) => t.value !== 'anonymous');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="compose-modal-title" className="text-lg font-semibold">
            Deixar mensagem para @{username}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot — hidden visually but accessible to bots */}
          <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              ref={honeypotRef}
            />
          </div>

          {/* Message type selector */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tipo de mensagem
            </legend>
            <div className="flex gap-2">
              {availableTypes.map((t) => (
                <label
                  key={t.value}
                  className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border p-3 text-center transition-colors ${
                    type === t.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={type === t.value}
                    onChange={() => setType(t.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {t.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Message content */}
          <div>
            <label
              htmlFor="message-content"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Mensagem
            </label>
            <textarea
              id="message-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={MAX_CHARS + 1}
              placeholder="Escreva sua mensagem aqui..."
              className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                isOverLimit
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-zinc-300 focus:ring-indigo-500 dark:border-zinc-600'
              } dark:bg-zinc-800 dark:text-zinc-100`}
              disabled={isSubmitting}
              aria-describedby="char-counter"
            />
            <div
              id="char-counter"
              className={`mt-1 text-right text-xs ${
                isOverLimit
                  ? 'font-medium text-red-500'
                  : charsRemaining <= 50
                    ? 'text-amber-500'
                    : 'text-zinc-400'
              }`}
              aria-live="polite"
            >
              {isOverLimit
                ? `${Math.abs(charsRemaining)} caracteres acima do limite`
                : `${charsRemaining} caracteres restantes`}
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverLimit || !content.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { changeUsernameAction } from '@/app/settings/profile/actions';

interface UsernameFormProps {
  currentUsername: string;
}

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

export function UsernameForm({ currentUsername }: UsernameFormProps) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clientError =
    value && !USERNAME_REGEX.test(value)
      ? 'Use apenas letras minúsculas, números, _ ou -. Mínimo 3, máximo 30 caracteres.'
      : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (clientError || value === currentUsername) return;

    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changeUsernameAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              parabuains.com/
            </span>
            <input
              id="username"
              name="username"
              type="text"
              value={value}
              onChange={(e) =>
                setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
              }
              className="w-full pl-32 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 border-gray-300"
              maxLength={30}
              required
              aria-describedby={clientError || error ? 'username-error' : undefined}
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !!clientError || value === currentUsername}
            className="px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        {(clientError || error) && (
          <p id="username-error" className="mt-1 text-sm text-red-600" role="alert">
            {clientError ?? error}
          </p>
        )}
        {success && (
          <p className="mt-1 text-sm text-green-600" role="status">
            Username alterado com sucesso!
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          ⚠️ Ao mudar de username, o URL antigo não redirecionará mais para seu perfil.
        </p>
      </div>
    </form>
  );
}

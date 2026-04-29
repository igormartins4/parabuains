'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

function TwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get('callbackURL') ?? '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authClient.twoFactor.verifyTotp({ code });
      router.push(callbackURL);
    } catch {
      setError('Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push('/login');
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mb-2 text-3xl">🔐</div>
        <h2 className="text-xl font-semibold text-gray-900">Verificação em duas etapas</h2>
        <p className="mt-1 text-sm text-gray-500">
          Digite o código do seu aplicativo autenticador.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Código de 6 dígitos
          </label>
          <input
            id="code"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="000000"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Verificando...' : 'Verificar'}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-gray-500">Carregando...</div>}>
      <TwoFactorForm />
    </Suspense>
  );
}

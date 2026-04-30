'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Algo deu errado</h2>
          <p className="text-gray-500 mb-4">Ocorreu um erro inesperado.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-brand-purple px-4 py-2 text-white text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}

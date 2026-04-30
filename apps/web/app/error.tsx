'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {}, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Algo deu errado</h2>
        <p className="text-gray-500">Ocorreu um erro inesperado. Nossa equipe foi notificada.</p>
        {error.digest && <p className="text-xs text-gray-400 font-mono">ID: {error.digest}</p>}
      </div>
      <button
        type="button"
        onClick={reset}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Tentar novamente
      </button>
    </div>
  );
}

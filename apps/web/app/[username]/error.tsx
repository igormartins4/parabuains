'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Profile error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          Não foi possível carregar este perfil
        </h2>
        <p className="text-gray-500 text-sm">
          O perfil pode ser privado ou não existir.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Tentar novamente
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export interface PushPermissionModalProps {
  isOpen: boolean;
  onClose(): void;
}

/**
 * Double-confirmation UX for Web Push permissions.
 *
 * IMPORTANT: Shows an app-level modal FIRST, before any browser dialog.
 * Only calls subscribe() (which triggers the browser permission prompt)
 * if the user explicitly clicks "Ativar notificações".
 */
export function PushPermissionModal({ isOpen, onClose }: PushPermissionModalProps) {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notificações push</h2>
          <p className="text-sm text-gray-600 mb-4">
            Seu navegador não suporta notificações push. Tente usar um navegador mais recente.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notificações bloqueadas</h2>
          <p className="text-sm text-gray-600 mb-4">
            As notificações estão bloqueadas no seu navegador. Para habilitá-las, acesse as
            configurações do site no seu navegador e permita notificações.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  }

  if (success || isSubscribed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🔔</div>
            <h2 className="text-lg font-semibold text-gray-900">Notificações ativadas!</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Você receberá lembretes de aniversário e outras notificações importantes.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Ótimo!
          </button>
        </div>
      </div>
    );
  }

  async function handleActivate() {
    setError(null);
    try {
      await subscribe();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ativar as notificações.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎂</div>
          <h2 className="text-lg font-semibold text-gray-900">Receba lembretes de aniversário</h2>
        </div>

        <p className="text-sm text-gray-600 mb-6 text-center">
          Ative as notificações para receber lembretes dos aniversários dos seus amigos, mensagens
          no mural e pedidos de amizade aceitos.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Ativando...' : 'Ativar notificações'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Agora não
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          Você pode desativar a qualquer momento nas configurações.
        </p>
      </div>
    </div>
  );
}

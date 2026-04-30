'use client';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';
import type { FriendshipStatus } from '@/lib/api/friendships';

interface FriendshipButtonProps {
  targetUserId: string;
  initialStatus: FriendshipStatus;
  initialFriendshipId?: string;
}

export function FriendshipButton({
  targetUserId,
  initialStatus,
  initialFriendshipId,
}: FriendshipButtonProps) {
  const { status, isPending, sendRequest, accept, remove } = useFriendshipStatus(
    initialStatus,
    initialFriendshipId
  );

  if (status === 'none') {
    return (
      <button
        type="button"
        onClick={() => sendRequest(targetUserId)}
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Enviando...' : 'Adicionar amigo'}
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 bg-neutral-100 text-neutral-500 text-sm font-medium rounded-lg cursor-not-allowed"
      >
        Pedido enviado
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={accept}
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Aceitar pedido
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors"
        >
          Recusar
        </button>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        className="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Removendo...' : 'Amigos'}
      </button>
    );
  }

  return null;
}

'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  acceptFriendRequest,
  declineOrRemoveFriendship,
  getPendingRequests,
} from '@/lib/api/friendships';

interface RequesterUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface PendingRequest {
  id: string;
  requesterId: string;
  requesterUser: RequesterUser;
}

export function PendingRequests() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingRequests()
      .then((data: { requests?: PendingRequest[] }) => setRequests(data.requests ?? []))
      // biome-ignore lint/suspicious/noConsole: intentional error logging in catch handler
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id: string) => {
    await acceptFriendRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDecline = async (id: string) => {
    await declineOrRemoveFriendship(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <div className="h-32 bg-neutral-100 rounded-xl animate-pulse" />;

  if (requests.length === 0) {
    return <p className="text-center text-neutral-500 py-8">Nenhum pedido de amizade pendente.</p>;
  }

  return (
    <ul className="space-y-3">
      {requests.map((req) => (
        <li
          key={req.id}
          className="flex items-center gap-3 p-4 bg-white border border-neutral-100 rounded-xl"
        >
          <Link href={`/${req.requesterUser.username}`} className="shrink-0">
            {req.requesterUser.avatarUrl ? (
              <Image
                src={req.requesterUser.avatarUrl}
                alt={req.requesterUser.displayName}
                width={44}
                height={44}
                className="rounded-full"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-neutral-200 flex items-center justify-center font-semibold text-neutral-600">
                {req.requesterUser.displayName.charAt(0)}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/${req.requesterUser.username}`}
              className="font-semibold text-neutral-900 hover:underline truncate block"
            >
              {req.requesterUser.displayName}
            </Link>
            <p className="text-sm text-neutral-500">@{req.requesterUser.username}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleAccept(req.id)}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aceitar
            </button>
            <button
              type="button"
              onClick={() => void handleDecline(req.id)}
              className="px-3 py-1.5 text-sm font-medium bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Recusar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

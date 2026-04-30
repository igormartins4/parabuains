'use client';
import { useState, useTransition } from 'react';
import type { FriendshipStatus } from '@/lib/api/friendships';
import {
  acceptFriendRequest,
  declineOrRemoveFriendship,
  sendFriendRequest,
} from '@/lib/api/friendships';

export function useFriendshipStatus(initialStatus: FriendshipStatus, initialFriendshipId?: string) {
  const [status, setStatus] = useState<FriendshipStatus>(initialStatus);
  const [friendshipId, setFriendshipId] = useState<string | undefined>(initialFriendshipId);
  const [isPending, startTransition] = useTransition();

  const sendRequest = (addresseeId: string) => {
    startTransition(async () => {
      try {
        const result = await sendFriendRequest(addresseeId);
        setFriendshipId(result.id);
        setStatus('pending_sent');
      } catch (_e) {}
    });
  };

  const accept = () => {
    if (!friendshipId) return;
    startTransition(async () => {
      try {
        await acceptFriendRequest(friendshipId);
        setStatus('accepted');
      } catch (_e) {}
    });
  };

  const remove = () => {
    if (!friendshipId) return;
    startTransition(async () => {
      try {
        await declineOrRemoveFriendship(friendshipId);
        setFriendshipId(undefined);
        setStatus('none');
      } catch (_e) {}
    });
  };

  return { status, friendshipId, isPending, sendRequest, accept, remove };
}

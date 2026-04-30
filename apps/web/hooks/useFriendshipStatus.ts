'use client';
import { useState, useTransition } from 'react';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineOrRemoveFriendship,
} from '@/lib/api/friendships';
import type { FriendshipStatus } from '@/lib/api/friendships';

export function useFriendshipStatus(
  initialStatus: FriendshipStatus,
  initialFriendshipId?: string,
) {
  const [status, setStatus] = useState<FriendshipStatus>(initialStatus);
  const [friendshipId, setFriendshipId] = useState<string | undefined>(
    initialFriendshipId,
  );
  const [isPending, startTransition] = useTransition();

  const sendRequest = (addresseeId: string) => {
    startTransition(async () => {
      try {
        const result = await sendFriendRequest(addresseeId);
        setFriendshipId(result.id);
        setStatus('pending_sent');
      } catch (e) {
        console.error(e);
      }
    });
  };

  const accept = () => {
    if (!friendshipId) return;
    startTransition(async () => {
      try {
        await acceptFriendRequest(friendshipId);
        setStatus('accepted');
      } catch (e) {
        console.error(e);
      }
    });
  };

  const remove = () => {
    if (!friendshipId) return;
    startTransition(async () => {
      try {
        await declineOrRemoveFriendship(friendshipId);
        setFriendshipId(undefined);
        setStatus('none');
      } catch (e) {
        console.error(e);
      }
    });
  };

  return { status, friendshipId, isPending, sendRequest, accept, remove };
}

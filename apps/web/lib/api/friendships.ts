export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export async function sendFriendRequest(addresseeId: string) {
  const res = await fetch('/api/friendships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresseeId }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Failed to send request');
  }
  return res.json() as Promise<{ id: string }>;
}

export async function acceptFriendRequest(friendshipId: string) {
  const res = await fetch(`/api/friendships/${friendshipId}/accept`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Failed to accept request');
  }
  return res.json();
}

export async function declineOrRemoveFriendship(friendshipId: string) {
  const res = await fetch(`/api/friendships/${friendshipId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Failed to remove friendship');
  }
}

export async function getFriends() {
  const res = await fetch('/api/friendships');
  if (!res.ok) throw new Error('Failed to fetch friends');
  return res.json();
}

export async function getPendingRequests() {
  const res = await fetch('/api/friendships/pending');
  if (!res.ok) throw new Error('Failed to fetch pending requests');
  return res.json();
}

export async function searchUsers(q: string, cursor?: string) {
  const params = new URLSearchParams({ q, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`/api/users/search?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search users');
  return res.json();
}

export async function getFriendshipStatus(
  targetUserId: string
): Promise<{ status: FriendshipStatus; friendshipId?: string }> {
  const res = await fetch(`/api/friendships/status/${targetUserId}`);
  if (!res.ok) return { status: 'none' };
  return res.json() as Promise<{ status: FriendshipStatus; friendshipId?: string }>;
}

export async function getSuggestions() {
  const res = await fetch('/api/friendships/suggestions');
  if (!res.ok) throw new Error('Failed to fetch suggestions');
  return res.json();
}

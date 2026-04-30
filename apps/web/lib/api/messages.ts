import 'server-only';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

async function apiFetch(path: string, options: RequestInit = {}, serviceToken?: string) {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(serviceToken ? { Authorization: `Bearer ${serviceToken}` } : {}),
  };
  const res = await fetch(`${INTERNAL_API_URL}${path}`, { ...options, headers: reqHeaders });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error((error as { error?: string }).error ?? 'API error'), {
      status: res.status,
    });
  }
  if (res.status === 204) return null;
  return res.json();
}

async function getServiceToken(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return createServiceToken(session.user.id, session.session.id);
}

export interface WallMessageData {
  id: string;
  profileId: string;
  authorId?: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  isAnonymous: boolean;
  isPrivate: boolean;
  content: string;
  status: 'pending' | 'published' | 'rejected';
  createdAt: string;
}

export interface WallSettingsData {
  wallWhoCanPost: 'friends' | 'authenticated';
  wallAllowAnonymous: boolean;
  wallRequireApproval: boolean;
}

/** Get published messages on a user's wall (public endpoint, auth optional) */
export async function getWallMessages(username: string): Promise<WallMessageData[]> {
  // Try to get a service token if the user is logged in; otherwise fetch unauthenticated
  let serviceToken: string | undefined;
  try {
    serviceToken = await getServiceToken();
  } catch {
    serviceToken = undefined;
  }
  const data = await apiFetch(`/v1/users/${encodeURIComponent(username)}/wall`, {}, serviceToken);
  return (data as { messages?: WallMessageData[] })?.messages ?? [];
}

/** Post a message on a user's wall */
export async function postWallMessage(
  username: string,
  content: string,
  type: 'public' | 'private' | 'anonymous',
): Promise<WallMessageData> {
  const serviceToken = await getServiceToken();
  return apiFetch(
    `/v1/users/${encodeURIComponent(username)}/wall`,
    { method: 'POST', body: JSON.stringify({ content, type }) },
    serviceToken,
  ) as Promise<WallMessageData>;
}

/** Delete a message */
export async function deleteWallMessage(messageId: string): Promise<void> {
  const serviceToken = await getServiceToken();
  await apiFetch(`/v1/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' }, serviceToken);
}

/** Approve a pending message */
export async function approveMessage(messageId: string): Promise<WallMessageData> {
  const serviceToken = await getServiceToken();
  return apiFetch(
    `/v1/messages/${encodeURIComponent(messageId)}/approve`,
    { method: 'PATCH' },
    serviceToken,
  ) as Promise<WallMessageData>;
}

/** Reject a pending message */
export async function rejectMessage(messageId: string): Promise<void> {
  const serviceToken = await getServiceToken();
  await apiFetch(
    `/v1/messages/${encodeURIComponent(messageId)}/reject`,
    { method: 'PATCH' },
    serviceToken,
  );
}

/** Report a message */
export async function reportMessage(
  messageId: string,
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other',
): Promise<void> {
  const serviceToken = await getServiceToken();
  await apiFetch(
    `/v1/messages/${encodeURIComponent(messageId)}/report`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    serviceToken,
  );
}

/** Get pending messages awaiting approval (for the logged-in user's wall) */
export async function getPendingMessages(): Promise<WallMessageData[]> {
  const serviceToken = await getServiceToken();
  const data = await apiFetch('/v1/users/me/wall/pending', {}, serviceToken);
  return (data as { messages?: WallMessageData[] })?.messages ?? [];
}

/** Update wall settings for the logged-in user */
export async function updateWallSettings(settings: Partial<WallSettingsData>): Promise<void> {
  const serviceToken = await getServiceToken();
  await apiFetch(
    '/v1/users/me/wall/settings',
    { method: 'PUT', body: JSON.stringify(settings) },
    serviceToken,
  );
}

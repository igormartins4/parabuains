'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceToken } from '@/lib/service-token';
import { z } from 'zod';

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'static', 'health', 'auth',
  'login', 'register', 'settings', 'feed', 'notifications',
]);

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
});

const privacySchema = z.object({
  privacyLevel: z.enum(['public', 'friends', 'private']).optional(),
  countdownVisibility: z.enum(['public', 'friends']).optional(),
  birthYearHidden: z.boolean().optional(),
});

const usernameSchema = z.object({
  username: z
    .string()
    .regex(USERNAME_REGEX, 'Username deve ter 3-30 caracteres: letras minúsculas, números, _ ou -')
    .refine((val) => !RESERVED_USERNAMES.has(val), 'Este username é reservado'),
});

async function getServiceToken(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');
  return createServiceToken(session.user.id, session.session.id);
}

export async function updateProfileAction(formData: FormData) {
  const serviceToken = await getServiceToken();

  const raw = {
    displayName: formData.get('displayName')?.toString() || undefined,
    bio: formData.get('bio')?.toString() || undefined,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/users/me/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: (err as { message?: string }).message ?? 'Erro ao salvar perfil' };
  }

  revalidatePath('/settings/profile');
  return { success: true };
}

export async function updatePrivacyAction(formData: FormData) {
  const serviceToken = await getServiceToken();

  const raw = {
    privacyLevel: formData.get('privacyLevel')?.toString() || undefined,
    countdownVisibility: formData.get('countdownVisibility')?.toString() || undefined,
    birthYearHidden: formData.has('birthYearHidden')
      ? formData.get('birthYearHidden') === 'true'
      : undefined,
  };

  const parsed = privacySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/users/me/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: (err as { message?: string }).message ?? 'Erro ao salvar configurações' };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    revalidatePath(`/${(session.user as unknown as { username?: string }).username ?? ''}`);
  }
  revalidatePath('/settings/profile');
  return { success: true };
}

export async function changeUsernameAction(formData: FormData) {
  const serviceToken = await getServiceToken();

  const raw = { username: formData.get('username')?.toString() ?? '' };

  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Username inválido' };
  }

  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/users/me/username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: (err as { message?: string }).message ?? 'Erro ao alterar username' };
  }

  const data = (await res.json()) as { username: string };
  revalidatePath('/settings/profile');
  revalidatePath(`/${data.username}`);
  return { success: true, newUsername: data.username };
}

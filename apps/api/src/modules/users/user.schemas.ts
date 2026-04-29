import { z } from 'zod';

export const usernameSchema = z
  .string()
  .regex(
    /^[a-z0-9_-]{3,30}$/,
    'Username must be 3-30 chars, lowercase letters, digits, underscore or hyphen',
  );

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'static',
  'health',
  'auth',
  'login',
  'register',
  'settings',
  'feed',
  'notifications',
]);

export const usernameChangeSchema = z.object({
  username: usernameSchema.refine(
    (val) => !RESERVED_USERNAMES.has(val),
    'This username is reserved',
  ),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  privacyLevel: z.enum(['public', 'friends', 'private']).optional(),
  countdownVisibility: z.enum(['public', 'friends']).optional(),
  birthYearHidden: z.boolean().optional(),
});

export const getProfileParamsSchema = z.object({
  username: z.string().min(1),
});

export const mutualFriendsParamsSchema = z.object({
  username: z.string().min(1),
});

// Response shapes
export const publicProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  birthday: z.string().nullable(), // MM-DD or YYYY-MM-DD depending on friendship + settings
  privacyLevel: z.enum(['public', 'friends', 'private']),
  countdownVisibility: z.enum(['public', 'friends']),
  daysUntilBirthday: z.number().nullable(),
});

export const mutualFriendsResponseSchema = z.object({
  count: z.number().int().min(0),
  sample: z.array(
    z.object({
      id: z.string().uuid(),
      username: z.string(),
      displayName: z.string(),
      avatarUrl: z.string().url().nullable(),
    }),
  ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UsernameChangeInput = z.infer<typeof usernameChangeSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type MutualFriendsResponse = z.infer<typeof mutualFriendsResponseSchema>;

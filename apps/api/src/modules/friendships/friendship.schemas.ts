import { z } from 'zod';

export const sendRequestSchema = z.object({
  addresseeId: z.string().uuid('addresseeId must be a valid UUID'),
});

export const friendshipIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const targetUserIdParamsSchema = z.object({
  targetUserId: z.string().uuid('targetUserId must be a valid UUID'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const friendshipStatusSchema = z.enum(['none', 'pending_sent', 'pending_received', 'accepted']);

// Response shapes
export const friendshipResponseSchema = z.object({
  id: z.string().uuid(),
  requesterId: z.string().uuid(),
  addresseeId: z.string().uuid(),
  status: z.enum(['pending', 'accepted']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const friendSummarySchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  friendshipId: z.string().uuid(),
});

export const searchResultSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  privacyLevel: z.enum(['public', 'friends', 'private']),
  friendshipStatus: friendshipStatusSchema,
});

export const searchResponseSchema = z.object({
  results: z.array(searchResultSchema),
  nextCursor: z.string().nullable(),
});

export const suggestionSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  mutualFriendsCount: z.number().int().min(0),
});

export type SendRequestInput = z.infer<typeof sendRequestSchema>;
export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type FriendSummary = z.infer<typeof friendSummarySchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;

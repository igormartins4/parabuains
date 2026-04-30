import { ConflictError, ForbiddenError, NotFoundError } from '../../errors.js';
import type { FriendshipRepository } from './friendship.repository.js';
import type { FriendshipStatus } from './friendship.schemas.js';

export class FriendshipService {
  constructor(private readonly repo: FriendshipRepository) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    // Prevenir auto-amizade
    if (requesterId === addresseeId) {
      throw new ConflictError('Cannot send friend request to yourself');
    }

    // Checar se já existe relação em qualquer direção
    const existing = await this.repo.findBetween(requesterId, addresseeId);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new ConflictError('You are already friends with this user');
      }
      if (existing.requesterId === requesterId) {
        throw new ConflictError('Friend request already sent');
      }
      // Addressee tentando enviar pedido para quem já enviou para ele → aceitar automaticamente
      return this.repo.accept(existing.id);
    }

    return this.repo.create(requesterId, addresseeId);
  }

  async acceptRequest(friendshipId: string, userId: string) {
    const friendship = await this.repo.findById(friendshipId);
    if (!friendship) throw new NotFoundError('Friend request not found');

    // Apenas o addressee pode aceitar
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenError('Only the request recipient can accept it');
    }
    if (friendship.status !== 'pending') {
      throw new ConflictError('Request is not in pending status');
    }

    return this.repo.accept(friendshipId);
  }

  async removeOrDecline(friendshipId: string, userId: string) {
    const friendship = await this.repo.findById(friendshipId);
    if (!friendship) throw new NotFoundError('Friendship not found');

    // Qualquer uma das partes pode remover/recusar
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new ForbiddenError('You are not part of this friendship');
    }

    await this.repo.remove(friendshipId);
  }

  async listFriends(userId: string) {
    return this.repo.listFriends(userId);
  }

  async listPendingReceived(userId: string) {
    return this.repo.listPendingReceived(userId);
  }

  async listPendingSent(userId: string) {
    return this.repo.listPendingSent(userId);
  }

  async getStatus(viewerId: string, targetUserId: string): Promise<{ status: FriendshipStatus }> {
    if (viewerId === targetUserId) return { status: 'none' };

    const friendship = await this.repo.findBetween(viewerId, targetUserId);
    if (!friendship) return { status: 'none' };

    if (friendship.status === 'accepted') return { status: 'accepted' };
    if (friendship.status === 'pending') {
      return {
        status: friendship.requesterId === viewerId ? 'pending_sent' : 'pending_received',
      };
    }
    return { status: 'none' };
  }

  async searchUsers(
    query: string,
    viewerId: string,
    limit: number,
    cursor?: { displayName: string; id: string }
  ) {
    const { users, friendships } = await this.repo.searchUsers(query, viewerId, limit, cursor);

    // Mapear status de amizade para cada usuário
    const friendshipMap = new Map<string, (typeof friendships)[number]>();
    for (const f of friendships) {
      const otherId = f.requesterId === viewerId ? f.addresseeId : f.requesterId;
      friendshipMap.set(otherId, f);
    }

    const results = users.slice(0, limit).map((user) => {
      const f = friendshipMap.get(user.id);
      let friendshipStatus: FriendshipStatus = 'none';
      if (f) {
        if (f.status === 'accepted') {
          friendshipStatus = 'accepted';
        } else if (f.status === 'pending') {
          friendshipStatus = f.requesterId === viewerId ? 'pending_sent' : 'pending_received';
        }
      }
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        privacyLevel: user.privacyLevel as 'public' | 'friends' | 'private',
        friendshipStatus,
      };
    });

    const hasMore = users.length > limit;
    const lastItem = results[results.length - 1];
    const nextCursor =
      hasMore && lastItem ? { displayName: lastItem.displayName, id: lastItem.id } : null;

    return { results, nextCursor };
  }

  async getSuggestions(userId: string) {
    const suggestions = await this.repo.getSuggestions(userId, 10);
    if (suggestions.length === 0) return [];

    // Buscar dados dos usuários sugeridos
    const suggestedUsers = await this.repo.findManyByIds(suggestions.map((s) => s.id));
    const userMap = new Map(suggestedUsers.map((u) => [u.id, u]));

    return suggestions
      .map((s) => {
        const user = userMap.get(s.id);
        if (!user) return null;
        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          mutualFriendsCount: s.mutualCount,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }
}

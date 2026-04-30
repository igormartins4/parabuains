import { describe, expect, it, vi } from 'vitest';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../errors.js';
import { FriendshipService } from '../friendship.service.js';

const makeRepo = (overrides = {}) => ({
  findBetween: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({
    id: 'f-id',
    requesterId: 'alice',
    addresseeId: 'bob',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  accept: vi.fn().mockResolvedValue({
    id: 'f-id',
    requesterId: 'alice',
    addresseeId: 'bob',
    status: 'accepted',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  remove: vi.fn().mockResolvedValue(undefined),
  listFriends: vi.fn().mockResolvedValue([]),
  listPendingReceived: vi.fn().mockResolvedValue([]),
  listPendingSent: vi.fn().mockResolvedValue([]),
  searchUsers: vi.fn().mockResolvedValue({ users: [], friendships: [] }),
  getSuggestions: vi.fn().mockResolvedValue([]),
  findManyByIds: vi.fn().mockResolvedValue([]),
  ...overrides,
});

const pendingFriendship = {
  id: 'f-id',
  requesterId: 'alice',
  addresseeId: 'bob',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const acceptedFriendship = { ...pendingFriendship, status: 'accepted' };

describe('FriendshipService.sendRequest', () => {
  it('throws ConflictError when trying to friend yourself', async () => {
    const service = new FriendshipService(makeRepo() as any);
    await expect(service.sendRequest('alice', 'alice')).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when already friends', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(acceptedFriendship) });
    const service = new FriendshipService(repo as any);
    await expect(service.sendRequest('alice', 'bob')).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when request already sent in same direction', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    await expect(service.sendRequest('alice', 'bob')).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when friendship request already exists', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    await expect(service.sendRequest('alice', 'bob')).rejects.toThrow(
      'Friend request already sent'
    );
  });

  it('auto-accepts when addressee sends request to requester (reciprocal)', async () => {
    const reciprocalPending = { ...pendingFriendship, requesterId: 'bob', addresseeId: 'alice' };
    const repo = makeRepo({
      findBetween: vi.fn().mockResolvedValue(reciprocalPending),
      accept: vi.fn().mockResolvedValue({ ...reciprocalPending, status: 'accepted' }),
    });
    const service = new FriendshipService(repo as any);
    const result = await service.sendRequest('alice', 'bob');
    expect(repo.accept).toHaveBeenCalledWith('f-id');
    expect(result.status).toBe('accepted');
  });

  it('creates new pending request when no existing relationship', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(null) });
    const service = new FriendshipService(repo as any);
    await service.sendRequest('alice', 'bob');
    expect(repo.create).toHaveBeenCalledWith('alice', 'bob');
  });
});

describe('FriendshipService.acceptRequest', () => {
  it('throws NotFoundError when friendship not found', async () => {
    const service = new FriendshipService(makeRepo() as any);
    await expect(service.acceptRequest('nonexistent', 'bob')).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when requester tries to accept own request', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    await expect(service.acceptRequest('f-id', 'alice')).rejects.toThrow(ForbiddenError);
  });

  it('throws ConflictError when request is not pending', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(acceptedFriendship) });
    const service = new FriendshipService(repo as any);
    await expect(service.acceptRequest('f-id', 'bob')).rejects.toThrow(ConflictError);
  });

  it('accepts request when called by addressee', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    const result = await service.acceptRequest('f-id', 'bob');
    expect(repo.accept).toHaveBeenCalledWith('f-id');
    expect(result.status).toBe('accepted');
  });
});

describe('FriendshipService.removeOrDecline', () => {
  it('throws NotFoundError when not found', async () => {
    const service = new FriendshipService(makeRepo() as any);
    await expect(service.removeOrDecline('nonexistent', 'alice')).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when third party tries to remove', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    await expect(service.removeOrDecline('f-id', 'charlie')).rejects.toThrow(ForbiddenError);
  });

  it('allows requester to remove', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    await service.removeOrDecline('f-id', 'alice');
    expect(repo.remove).toHaveBeenCalledWith('f-id');
  });

  it('allows addressee to remove', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    await service.removeOrDecline('f-id', 'bob');
    expect(repo.remove).toHaveBeenCalledWith('f-id');
  });
});

describe('FriendshipService.getStatus', () => {
  it('returns none when no friendship exists', async () => {
    const service = new FriendshipService(makeRepo() as any);
    const result = await service.getStatus('alice', 'bob');
    expect(result.status).toBe('none');
  });

  it('returns accepted when friendship is accepted', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(acceptedFriendship) });
    const service = new FriendshipService(repo as any);
    const result = await service.getStatus('alice', 'bob');
    expect(result.status).toBe('accepted');
  });

  it('returns pending_sent when viewer is requester', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    const result = await service.getStatus('alice', 'bob');
    expect(result.status).toBe('pending_sent');
  });

  it('returns pending_received when viewer is addressee', async () => {
    const repo = makeRepo({ findBetween: vi.fn().mockResolvedValue(pendingFriendship) });
    const service = new FriendshipService(repo as any);
    const result = await service.getStatus('bob', 'alice');
    expect(result.status).toBe('pending_received');
  });

  it('returns none when viewer === targetUser', async () => {
    const service = new FriendshipService(makeRepo() as any);
    const result = await service.getStatus('alice', 'alice');
    expect(result.status).toBe('none');
  });
});

describe('FriendshipService.searchUsers', () => {
  it('returns empty results when no users found', async () => {
    const service = new FriendshipService(makeRepo() as any);
    const result = await service.searchUsers('test', 'alice', 20);
    expect(result.results).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it('maps friendship status correctly for search results', async () => {
    const mockUser = {
      id: 'bob',
      username: 'bob',
      displayName: 'Bob',
      avatarUrl: null,
      privacyLevel: 'public',
      email: 'bob@example.com',
      emailVerified: true,
      passwordHash: null,
      bio: null,
      birthDate: new Date(),
      birthYearHidden: false,
      totpSecret: null,
      totpEnabled: false,
      timezone: 'UTC',
      notificationSendHour: 8,
      wallWhoCanPost: 'friends',
      wallAllowAnonymous: true,
      wallRequireApproval: false,
      countdownVisibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const mockFriendship = {
      id: 'f-id',
      requesterId: 'alice',
      addresseeId: 'bob',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repo = makeRepo({
      searchUsers: vi.fn().mockResolvedValue({
        users: [mockUser],
        friendships: [mockFriendship],
      }),
    });
    const service = new FriendshipService(repo as any);
    const result = await service.searchUsers('bob', 'alice', 20);
    expect(result.results[0]?.friendshipStatus).toBe('pending_sent');
  });
});

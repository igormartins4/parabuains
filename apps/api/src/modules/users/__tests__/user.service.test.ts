import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '../../../errors.js';
import { UserService } from '../user.service.js';

const makeRepo = (overrides = {}) => ({
  findByUsername: vi.fn(),
  findById: vi.fn(),
  areFriends: vi.fn().mockResolvedValue(false),
  getMutualFriends: vi.fn().mockResolvedValue({ count: 0, sample: [] }),
  updateProfile: vi.fn(),
  changeUsername: vi.fn(),
  isUsernameInHistory: vi.fn().mockResolvedValue(false),
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  id: 'user-uuid-1',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'Hello world',
  avatarUrl: null,
  birthDate: new Date('1990-03-15'),
  privacyLevel: 'public',
  countdownVisibility: 'public',
  birthYearHidden: true,
  updatedAt: new Date(),
  ...overrides,
});

describe('UserService.getProfile', () => {
  it('returns 404 for private profile when viewer is not authenticated', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ privacyLevel: 'private' })),
    });
    const service = new UserService(repo as any);
    await expect(service.getProfile('testuser', undefined)).rejects.toThrow(NotFoundError);
  });

  it('returns 404 for private profile when viewer is not a friend', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ privacyLevel: 'private' })),
      areFriends: vi.fn().mockResolvedValue(false),
    });
    const service = new UserService(repo as any);
    await expect(service.getProfile('testuser', 'other-user-id')).rejects.toThrow(NotFoundError);
  });

  it('returns full profile for private profile when viewer is a friend', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ privacyLevel: 'private' })),
      areFriends: vi.fn().mockResolvedValue(true),
    });
    const service = new UserService(repo as any);
    const result = await service.getProfile('testuser', 'friend-id');
    expect(result).toHaveProperty('username', 'testuser');
    expect(result).toHaveProperty('bio');
  });

  it('returns full profile for self regardless of privacy', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ privacyLevel: 'private' })),
    });
    const service = new UserService(repo as any);
    const result = await service.getProfile('testuser', 'user-uuid-1');
    expect(result).toHaveProperty('bio', 'Hello world');
  });

  it('returns minimal profile for friends-only profile to a stranger', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ privacyLevel: 'friends' })),
    });
    const service = new UserService(repo as any);
    const result = (await service.getProfile('testuser', 'stranger-id')) as any;
    expect(result.bio).toBeNull();
    expect(result.birthday).toBeNull();
  });

  it('returns full profile for public profile', async () => {
    const repo = makeRepo({
      findByUsername: vi.fn().mockResolvedValue(makeUser({ privacyLevel: 'public' })),
    });
    const service = new UserService(repo as any);
    const result = await service.getProfile('testuser', undefined);
    expect(result).toHaveProperty('bio', 'Hello world');
  });

  it('hides birth year for non-friends when birthYearHidden is true', async () => {
    const repo = makeRepo({
      findByUsername: vi
        .fn()
        .mockResolvedValue(makeUser({ privacyLevel: 'public', birthYearHidden: true })),
    });
    const service = new UserService(repo as any);
    const result = (await service.getProfile('testuser', 'stranger')) as any;
    // Should be MM-DD format only
    expect(result.birthday).toMatch(/^\d{2}-\d{2}$/);
  });

  it('shows birth year for friends when birthYearHidden is false', async () => {
    const repo = makeRepo({
      findByUsername: vi
        .fn()
        .mockResolvedValue(makeUser({ privacyLevel: 'public', birthYearHidden: false })),
      areFriends: vi.fn().mockResolvedValue(true),
    });
    const service = new UserService(repo as any);
    const result = (await service.getProfile('testuser', 'friend-id')) as any;
    expect(result.birthday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 404 when user does not exist', async () => {
    const repo = makeRepo({ findByUsername: vi.fn().mockResolvedValue(null) });
    const service = new UserService(repo as any);
    await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundError);
  });
});

describe('UserService.changeUsername', () => {
  it('throws ConflictError when username is taken by another user', async () => {
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(makeUser()),
      findByUsername: vi.fn().mockResolvedValue(makeUser({ id: 'other-user-id' })),
    });
    const service = new UserService(repo as any);
    await expect(service.changeUsername('user-uuid-1', { username: 'newname' })).rejects.toThrow(
      ConflictError
    );
  });

  it('allows username change when new username is available', async () => {
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(makeUser()),
      findByUsername: vi.fn().mockResolvedValue(null),
      changeUsername: vi.fn().mockResolvedValue(makeUser({ username: 'newname' })),
    });
    const service = new UserService(repo as any);
    await service.changeUsername('user-uuid-1', { username: 'newname' });
    expect(repo.changeUsername).toHaveBeenCalledWith('user-uuid-1', 'newname', 'testuser');
  });

  it('throws NotFoundError when user does not exist', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = new UserService(repo as any);
    await expect(service.changeUsername('nonexistent', { username: 'newname' })).rejects.toThrow(
      NotFoundError
    );
  });
});

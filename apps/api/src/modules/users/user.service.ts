import { NotFoundError, ConflictError } from '../../errors.js';
import { UserRepository } from './user.repository.js';
import type { UpdateProfileInput, UsernameChangeInput } from './user.schemas.js';

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  birthDate: Date | string | null;
  birthYearHidden: boolean;
  privacyLevel: string;
  countdownVisibility: string;
  [key: string]: unknown;
};

export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getProfile(username: string, viewerId?: string) {
    const user = (await this.userRepo.findByUsername(username)) as UserRow | null;
    if (!user) throw new NotFoundError('User not found');

    const isSelf = viewerId === user.id;
    const isFriend =
      !isSelf && viewerId ? await this.userRepo.areFriends(viewerId, user.id) : false;

    // Private profile: 404 for non-auth AND non-friends (per AGENTS.md constraint)
    if (user.privacyLevel === 'private' && !isSelf && !isFriend) {
      throw new NotFoundError('User not found'); // 404, not 403
    }

    // Friends-only profile: return minimal profile for strangers
    if (user.privacyLevel === 'friends' && !isSelf && !isFriend) {
      return this.buildMinimalProfile(user);
    }

    return this.buildFullProfile(user, isFriend || isSelf);
  }

  private buildMinimalProfile(user: UserRow) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: null,
      birthday: null,
      privacyLevel: user.privacyLevel,
      countdownVisibility: user.countdownVisibility,
      daysUntilBirthday: null,
      isMinimal: true,
    };
  }

  private buildFullProfile(user: UserRow, canSeeBirthYear: boolean) {
    let birthday: string | null = null;
    if (user.birthDate) {
      const d = new Date(user.birthDate);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (canSeeBirthYear && !user.birthYearHidden) {
        birthday = `${d.getFullYear()}-${month}-${day}`;
      } else {
        birthday = `${month}-${day}`;
      }
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      birthday,
      privacyLevel: user.privacyLevel,
      countdownVisibility: user.countdownVisibility,
      birthYearHidden: user.birthYearHidden,
      daysUntilBirthday: null, // computed by Next.js BFF with Luxon + user timezone
    };
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const updated = await this.userRepo.updateProfile(userId, data);
    if (!updated) throw new NotFoundError('User not found');
    return updated;
  }

  async changeUsername(userId: string, input: UsernameChangeInput) {
    const user = (await this.userRepo.findById(userId)) as UserRow | null;
    if (!user) throw new NotFoundError('User not found');

    const existing = await this.userRepo.findByUsername(input.username);
    if (existing && existing.id !== userId) {
      throw new ConflictError('Username already taken');
    }

    return this.userRepo.changeUsername(userId, input.username, user.username);
  }

  async getMutualFriends(username: string, viewerId: string) {
    const user = await this.userRepo.findByUsername(username);
    if (!user) throw new NotFoundError('User not found');

    return this.userRepo.getMutualFriends(viewerId, user.id);
  }
}

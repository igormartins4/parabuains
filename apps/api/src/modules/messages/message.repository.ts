import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db.js';
import { wallMessages, messageReports, users, friendships } from '@parabuains/db';
import type {
  IMessageRepository,
  WallMessage,
  WallSettings,
  UserWallProfile,
  MessageStatus,
} from './message.types.js';

export class DrizzleMessageRepository implements IMessageRepository {
  private get db() {
    return getDb();
  }

  async findWallMessages(
    profileId: string,
    viewerRelation: 'owner' | 'author' | 'public',
  ): Promise<WallMessage[]> {
    const baseConditions = [
      eq(wallMessages.profileId, profileId),
      isNull(wallMessages.deletedAt),
      eq(wallMessages.status, 'published'),
    ];

    // Public viewers cannot see private messages
    if (viewerRelation === 'public') {
      baseConditions.push(eq(wallMessages.isPrivate, false));
    }

    const rows = await this.db
      .select()
      .from(wallMessages)
      .where(and(...baseConditions))
      .orderBy(desc(wallMessages.createdAt));

    return rows as WallMessage[];
  }

  async create(input: {
    profileId: string;
    authorId: string;
    content: string;
    isAnonymous: boolean;
    isPrivate: boolean;
    status: MessageStatus;
  }): Promise<WallMessage> {
    const [msg] = await this.db
      .insert(wallMessages)
      .values(input)
      .returning();
    return msg as WallMessage;
  }

  async findById(id: string): Promise<WallMessage | null> {
    const [msg] = await this.db
      .select()
      .from(wallMessages)
      .where(eq(wallMessages.id, id));
    return (msg as WallMessage) ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(wallMessages)
      .set({ deletedAt: new Date() })
      .where(eq(wallMessages.id, id));
  }

  async updateStatus(id: string, status: MessageStatus): Promise<WallMessage> {
    const [msg] = await this.db
      .update(wallMessages)
      .set({ status })
      .where(eq(wallMessages.id, id))
      .returning();
    return msg as WallMessage;
  }

  async createReport(messageId: string, reporterId: string, reason: string): Promise<void> {
    await this.db
      .insert(messageReports)
      .values({ messageId, reporterId, reason })
      .onConflictDoNothing();
  }

  async countReports(messageId: string): Promise<number> {
    const rows = await this.db
      .select()
      .from(messageReports)
      .where(eq(messageReports.messageId, messageId));
    return rows.length;
  }

  async findPendingByProfileId(profileId: string): Promise<WallMessage[]> {
    const rows = await this.db
      .select()
      .from(wallMessages)
      .where(
        and(
          eq(wallMessages.profileId, profileId),
          eq(wallMessages.status, 'pending'),
          isNull(wallMessages.deletedAt),
        ),
      )
      .orderBy(desc(wallMessages.createdAt));
    return rows as WallMessage[];
  }

  async updateWallSettings(userId: string, settings: Partial<WallSettings>): Promise<void> {
    await this.db.update(users).set(settings).where(eq(users.id, userId));
  }

  async findUserWithWallSettings(usernameOrId: string): Promise<UserWallProfile | null> {
    // Try by username first
    const [user] = await this.db
      .select({
        id: users.id,
        username: users.username,
        privacyLevel: users.privacyLevel,
        wallWhoCanPost: users.wallWhoCanPost,
        wallAllowAnonymous: users.wallAllowAnonymous,
        wallRequireApproval: users.wallRequireApproval,
      })
      .from(users)
      .where(and(eq(users.username, usernameOrId), isNull(users.deletedAt)));

    if (user) return user as UserWallProfile;

    // Fallback: look up by ID
    const [userById] = await this.db
      .select({
        id: users.id,
        username: users.username,
        privacyLevel: users.privacyLevel,
        wallWhoCanPost: users.wallWhoCanPost,
        wallAllowAnonymous: users.wallAllowAnonymous,
        wallRequireApproval: users.wallRequireApproval,
      })
      .from(users)
      .where(and(eq(users.id, usernameOrId), isNull(users.deletedAt)));

    return (userById as UserWallProfile) ?? null;
  }

  async isFriend(userId: string, targetId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          sql`(
            (${friendships.requesterId} = ${userId} AND ${friendships.addresseeId} = ${targetId})
            OR
            (${friendships.requesterId} = ${targetId} AND ${friendships.addresseeId} = ${userId})
          )`,
        ),
      );
    return rows.length > 0;
  }
}

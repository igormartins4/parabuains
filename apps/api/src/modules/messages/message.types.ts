export type MessageStatus = 'pending' | 'published' | 'rejected';
export type MessageType = 'public' | 'private' | 'anonymous';
export type WallWhoCanPost = 'friends' | 'authenticated';

export interface WallMessage {
  id: string;
  profileId: string;
  authorId: string | null;
  isAnonymous: boolean;
  isPrivate: boolean;
  content: string;
  status: MessageStatus;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface WallMessageResponse {
  id: string;
  profileId: string;
  /** authorId is NEVER present for anonymous messages */
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
  status: MessageStatus;
  createdAt: Date;
}

export interface PostMessageInput {
  profileId: string;
  authorId: string;
  content: string;
  type: MessageType;
}

export interface WallSettings {
  wallWhoCanPost: WallWhoCanPost;
  wallAllowAnonymous: boolean;
  wallRequireApproval: boolean;
}

export interface UserWallProfile {
  id: string;
  username: string;
  privacyLevel: string;
  wallWhoCanPost: WallWhoCanPost;
  wallAllowAnonymous: boolean;
  wallRequireApproval: boolean;
}

export interface IMessageRepository {
  findWallMessages(
    profileId: string,
    viewerRelation: 'owner' | 'author' | 'public'
  ): Promise<WallMessage[]>;
  create(input: {
    profileId: string;
    authorId: string;
    content: string;
    isAnonymous: boolean;
    isPrivate: boolean;
    status: MessageStatus;
  }): Promise<WallMessage>;
  findById(id: string): Promise<WallMessage | null>;
  softDelete(id: string): Promise<void>;
  updateStatus(id: string, status: MessageStatus): Promise<WallMessage>;
  createReport(messageId: string, reporterId: string, reason: string): Promise<void>;
  countReports(messageId: string): Promise<number>;
  findPendingByProfileId(profileId: string): Promise<WallMessage[]>;
  updateWallSettings(userId: string, settings: Partial<WallSettings>): Promise<void>;
  findUserWithWallSettings(usernameOrId: string): Promise<UserWallProfile | null>;
  isFriend(userId: string, targetId: string): Promise<boolean>;
}

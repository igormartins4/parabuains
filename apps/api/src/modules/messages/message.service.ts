import sanitizeHtml from 'sanitize-html';
import type { Queue } from 'bullmq';
import type {
  IMessageRepository,
  PostMessageInput,
  WallMessageResponse,
  WallSettings,
  MessageStatus,
} from './message.types.js';

/** Number of reports before a message is auto-hidden for owner review. */
const AUTO_HIDE_REPORT_THRESHOLD = 5;

/**
 * Strips ALL HTML tags from message content.
 * Messages are stored as plain text only — no HTML, no markdown.
 * MUST be called before persistence, not after.
 */
export function sanitizeMessage(content: string): string {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim();
}

export class MessageService {
  constructor(
    private messageRepo: IMessageRepository,
    private notificationQueue: Queue,
  ) {}

  /**
   * CRITICAL SECURITY: Strips author identity from anonymous messages.
   * Enforced here at service layer — never delegate to route layer.
   * If isAnonymous === true, authorId and author are NEVER included in response.
   */
  formatForResponse(message: {
    id: string;
    profileId: string;
    authorId: string | null;
    isAnonymous: boolean;
    isPrivate: boolean;
    content: string;
    status: string;
    createdAt: Date;
    author?: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
  }): WallMessageResponse {
    if (message.isAnonymous) {
      // Intentionally return object WITHOUT authorId or author fields
      return {
        id: message.id,
        profileId: message.profileId,
        isAnonymous: true,
        isPrivate: message.isPrivate,
        content: message.content,
        status: message.status as MessageStatus,
        createdAt: message.createdAt,
      };
    }
    return {
      id: message.id,
      profileId: message.profileId,
      authorId: message.authorId ?? undefined,
      author: message.author,
      isAnonymous: false,
      isPrivate: message.isPrivate,
      content: message.content,
      status: message.status as MessageStatus,
      createdAt: message.createdAt,
    };
  }

  async getWallMessages(
    username: string,
    viewerId: string | null,
  ): Promise<WallMessageResponse[]> {
    const profile = await this.messageRepo.findUserWithWallSettings(username);
    if (!profile) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const viewerRelation: 'owner' | 'public' =
      viewerId && viewerId === profile.id ? 'owner' : 'public';

    const messages = await this.messageRepo.findWallMessages(profile.id, viewerRelation);
    return messages.map((m) => this.formatForResponse(m));
  }

  async postMessage(input: PostMessageInput): Promise<WallMessageResponse> {
    const profile = await this.messageRepo.findUserWithWallSettings(input.profileId);
    if (!profile) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const isAnonymous = input.type === 'anonymous';
    const isPrivate = input.type === 'private';

    // Validate anonymous is allowed on this wall
    if (isAnonymous && !profile.wallAllowAnonymous) {
      throw Object.assign(
        new Error('Anonymous messages not allowed on this wall'),
        { statusCode: 400 },
      );
    }

    // XSS sanitization BEFORE persistence — service layer responsibility
    const sanitizedContent = sanitizeMessage(input.content);
    if (!sanitizedContent) {
      throw Object.assign(
        new Error('Message content is empty after sanitization'),
        { statusCode: 400 },
      );
    }

    // Determine initial status based on wall settings
    const initialStatus: MessageStatus = profile.wallRequireApproval ? 'pending' : 'published';

    const message = await this.messageRepo.create({
      profileId: input.profileId,
      authorId: input.authorId,
      content: sanitizedContent,
      isAnonymous,
      isPrivate,
      status: initialStatus,
    });

    // Enqueue notification only for immediately published messages
    if (initialStatus === 'published') {
      await this.notificationQueue.add('wall.message_posted', {
        type: 'wall.message_posted',
        profileId: input.profileId,
        authorId: input.authorId,
        messageId: message.id,
      });
    }

    return this.formatForResponse(message);
  }

  async deleteMessage(messageId: string, requesterId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.deletedAt) {
      throw Object.assign(new Error('Message not found'), { statusCode: 404 });
    }

    const isOwner = message.profileId === requesterId;
    // Anonymous authors cannot delete their own messages (identity hidden)
    const isAuthor = !message.isAnonymous && message.authorId === requesterId;

    if (!isOwner && !isAuthor) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }

    await this.messageRepo.softDelete(messageId);
  }

  async approveMessage(messageId: string, requesterId: string): Promise<WallMessageResponse> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw Object.assign(new Error('Message not found'), { statusCode: 404 });
    }
    if (message.profileId !== requesterId) {
      throw Object.assign(
        new Error('Forbidden — only wall owner can approve'),
        { statusCode: 403 },
      );
    }

    const updated = await this.messageRepo.updateStatus(messageId, 'published');

    // Enqueue notification after approval
    await this.notificationQueue.add('wall.message_posted', {
      type: 'wall.message_posted',
      profileId: message.profileId,
      authorId: message.authorId,
      messageId: message.id,
    });

    return this.formatForResponse(updated);
  }

  async rejectMessage(messageId: string, requesterId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw Object.assign(new Error('Message not found'), { statusCode: 404 });
    }
    if (message.profileId !== requesterId) {
      throw Object.assign(
        new Error('Forbidden — only wall owner can reject'),
        { statusCode: 403 },
      );
    }
    await this.messageRepo.updateStatus(messageId, 'rejected');
  }

  async reportMessage(
    messageId: string,
    reporterId: string,
    reason: string,
  ): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw Object.assign(new Error('Message not found'), { statusCode: 404 });
    }

    await this.messageRepo.createReport(messageId, reporterId, reason);

    // Auto-hide: if reports reach threshold, re-queue for owner review
    const reportCount = await this.messageRepo.countReports(messageId);
    if (reportCount >= AUTO_HIDE_REPORT_THRESHOLD && message.status === 'published') {
      await this.messageRepo.updateStatus(messageId, 'pending');
    }
  }

  async getPendingMessages(ownerId: string): Promise<WallMessageResponse[]> {
    const messages = await this.messageRepo.findPendingByProfileId(ownerId);
    return messages.map((m) => this.formatForResponse(m));
  }

  async updateWallSettings(
    ownerId: string,
    settings: Partial<WallSettings>,
  ): Promise<void> {
    await this.messageRepo.updateWallSettings(ownerId, settings);
  }
}

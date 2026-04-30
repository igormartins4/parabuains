import type {
  INotificationPreferencesRepository,
  NotificationPreference,
  NotificationChannel,
} from './notification-preferences.repository.js';
import type { INotificationLogRepository } from './notification-log.repository.js';
import type { EmailTransport } from './email.transport.js';

export interface IUserLookup {
  findById(id: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    username: string;
  } | null>;
}

export class NotificationService {
  constructor(
    private readonly prefsRepo: INotificationPreferencesRepository,
    private readonly logRepo: INotificationLogRepository,
    private readonly emailTransport: EmailTransport,
    private readonly userRepo: IUserLookup,
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.prefsRepo.getByUserId(userId);
  }

  async upsertPreference(
    userId: string,
    channel: NotificationChannel,
    daysBefore: number[],
    enabled: boolean,
  ): Promise<NotificationPreference> {
    return this.prefsRepo.upsert(userId, channel, daysBefore, enabled);
  }

  /**
   * Called by BullMQ worker when a wall message is posted.
   * Sends email notification to the wall owner if email pref is enabled.
   */
  async handleWallMessagePosted(
    profileId: string,
    authorId: string | null,
  ): Promise<void> {
    const profile = await this.userRepo.findById(profileId);
    if (!profile) return;

    const prefs = await this.prefsRepo.getByUserId(profileId);
    const emailPref = prefs.find((p) => p.channel === 'email');
    if (!emailPref?.enabled) return;

    let senderName: string | null = null;
    if (authorId) {
      const author = await this.userRepo.findById(authorId);
      senderName = author?.displayName ?? null;
    }

    try {
      await this.emailTransport.sendWallMessageNotification({
        to: profile.email,
        recipientName: profile.displayName,
        senderName,
        profileUsername: profile.username,
      });

      await this.logRepo.create({
        recipientId: profileId,
        subjectId: authorId ?? profileId,
        channel: 'email',
        reminderType: 'Dday',
        status: 'sent',
      });
    } catch (err) {
      await this.logRepo.create({
        recipientId: profileId,
        subjectId: authorId ?? profileId,
        channel: 'email',
        reminderType: 'Dday',
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Called by BullMQ worker when a friendship request is accepted.
   * Notifies the original requester (recipientId) that their request was accepted.
   */
  async handleFriendshipAccepted(
    recipientId: string,
    actorId: string,
  ): Promise<void> {
    const recipient = await this.userRepo.findById(recipientId);
    if (!recipient) return;

    const prefs = await this.prefsRepo.getByUserId(recipientId);
    const emailPref = prefs.find((p) => p.channel === 'email');
    if (!emailPref?.enabled) return;

    const actor = await this.userRepo.findById(actorId);
    if (!actor) return;

    try {
      await this.emailTransport.sendFriendshipAcceptedNotification({
        to: recipient.email,
        recipientName: recipient.displayName,
        friendName: actor.displayName,
        friendUsername: actor.username,
      });

      await this.logRepo.create({
        recipientId,
        subjectId: actorId,
        channel: 'email',
        reminderType: 'Dday',
        status: 'sent',
      });
    } catch (err) {
      await this.logRepo.create({
        recipientId,
        subjectId: actorId,
        channel: 'email',
        reminderType: 'Dday',
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

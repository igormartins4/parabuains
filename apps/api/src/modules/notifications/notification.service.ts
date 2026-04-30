import type { EmailTransport } from './email.transport.js';
import type { INotificationLogRepository } from './notification-log.repository.js';
import type {
  INotificationPreferencesRepository,
  NotificationChannel,
  NotificationPreference,
} from './notification-preferences.repository.js';
import type { IPushSubscriptionRepository } from './push-subscription.repository.js';
import type { VapidTransport } from './vapid.transport.js';

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
    private readonly emailTransport: EmailTransport | null,
    private readonly userRepo: IUserLookup,
    private readonly vapidTransport: VapidTransport | null = null,
    private readonly pushSubRepo: IPushSubscriptionRepository | null = null
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.prefsRepo.getByUserId(userId);
  }

  async upsertPreference(
    userId: string,
    channel: NotificationChannel,
    daysBefore: number[],
    enabled: boolean
  ): Promise<NotificationPreference> {
    return this.prefsRepo.upsert(userId, channel, daysBefore, enabled);
  }

  /**
   * Called by BullMQ worker when a wall message is posted.
   * Sends email + push notification to the wall owner per their preferences.
   */
  async handleWallMessagePosted(profileId: string, authorId: string | null): Promise<void> {
    const profile = await this.userRepo.findById(profileId);
    if (!profile) return;

    const prefs = await this.prefsRepo.getByUserId(profileId);
    const subjectId = authorId ?? profileId;

    // ── Email delivery ────────────────────────────────────────────────────────
    const emailPref = prefs.find((p) => p.channel === 'email');
    if (emailPref?.enabled && this.emailTransport) {
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
          subjectId,
          channel: 'email',
          reminderType: 'Dday',
          status: 'sent',
        });
      } catch (err) {
        await this.logRepo.create({
          recipientId: profileId,
          subjectId,
          channel: 'email',
          reminderType: 'Dday',
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ── Push delivery ─────────────────────────────────────────────────────────
    const pushPref = prefs.find((p) => p.channel === 'push');
    if (pushPref?.enabled && this.vapidTransport && this.pushSubRepo) {
      const subs = await this.pushSubRepo.findByUserId(profileId);
      for (const sub of subs) {
        try {
          const result = await this.vapidTransport.sendPushNotification(sub, {
            title: 'Nova mensagem no seu mural',
            body: 'Você recebeu uma mensagem no seu mural do Parabuains.',
            url: `/${profile.username}`,
          });
          if (result === 'invalid_endpoint') {
            await this.pushSubRepo.deleteByEndpoint(sub.endpoint);
          }
        } catch {
          // Continue with other subscriptions if one fails
        }
      }
    }
  }

  /**
   * Called by BullMQ worker when a friendship request is accepted.
   * Notifies the original requester (recipientId) per their preferences.
   */
  async handleFriendshipAccepted(recipientId: string, actorId: string): Promise<void> {
    const recipient = await this.userRepo.findById(recipientId);
    if (!recipient) return;

    const actor = await this.userRepo.findById(actorId);
    if (!actor) return;

    const prefs = await this.prefsRepo.getByUserId(recipientId);

    // ── Email delivery ────────────────────────────────────────────────────────
    const emailPref = prefs.find((p) => p.channel === 'email');
    if (emailPref?.enabled && this.emailTransport) {
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

    // ── Push delivery ─────────────────────────────────────────────────────────
    const pushPref = prefs.find((p) => p.channel === 'push');
    if (pushPref?.enabled && this.vapidTransport && this.pushSubRepo) {
      const subs = await this.pushSubRepo.findByUserId(recipientId);
      for (const sub of subs) {
        try {
          const result = await this.vapidTransport.sendPushNotification(sub, {
            title: `${actor.displayName} aceitou sua amizade`,
            body: 'Agora vocês são amigos no Parabuains!',
            url: `/${actor.username}`,
          });
          if (result === 'invalid_endpoint') {
            await this.pushSubRepo.deleteByEndpoint(sub.endpoint);
          }
        } catch {
          // Continue with other subscriptions if one fails
        }
      }
    }
  }

  /** Save a push subscription for a user. */
  async savePushSubscription(
    userId: string,
    sub: { endpoint: string; p256dhKey: string; authKey: string; userAgent?: string }
  ): Promise<void> {
    if (!this.pushSubRepo) throw new Error('Push subscription repository not configured');
    await this.pushSubRepo.save(userId, sub);
  }

  /** Delete a push subscription by endpoint. */
  async deletePushSubscription(endpoint: string): Promise<void> {
    if (!this.pushSubRepo) throw new Error('Push subscription repository not configured');
    await this.pushSubRepo.deleteByEndpoint(endpoint);
  }
}

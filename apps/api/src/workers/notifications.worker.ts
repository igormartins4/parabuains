import { Worker } from 'bullmq';
import { getRedis } from '../infrastructure/redis.js';
import { NotificationService } from '../modules/notifications/notification.service.js';
import { DrizzleNotificationPreferencesRepository } from '../modules/notifications/notification-preferences.repository.js';
import { DrizzleNotificationLogRepository } from '../modules/notifications/notification-log.repository.js';
import { EmailTransport } from '../modules/notifications/email.transport.js';
import { VapidTransport } from '../modules/notifications/vapid.transport.js';
import { DrizzlePushSubscriptionRepository } from '../modules/notifications/push-subscription.repository.js';
import { UserRepository } from '../modules/users/user.repository.js';
import type { BirthdayReminderJob } from './birthday-scheduler.worker.js';
import { DateTime } from 'luxon';

function createNotificationService(): NotificationService {
  const prefsRepo = new DrizzleNotificationPreferencesRepository();
  const logRepo = new DrizzleNotificationLogRepository();
  const userRepo = new UserRepository();
  const pushSubRepo = new DrizzlePushSubscriptionRepository();

  const apiKey = process.env['RESEND_API_KEY'] ?? '';
  const fromEmail = process.env['RESEND_FROM_EMAIL'] ?? 'noreply@parabuains.com';
  const emailTransport = new EmailTransport(apiKey, fromEmail);

  const vapidPublicKey = process.env['VAPID_PUBLIC_KEY'];
  const vapidPrivateKey = process.env['VAPID_PRIVATE_KEY'];
  const vapidSubject = process.env['VAPID_SUBJECT'] ?? 'mailto:admin@parabuains.com';
  const vapidTransport =
    vapidPublicKey && vapidPrivateKey
      ? new VapidTransport(vapidPublicKey, vapidPrivateKey, vapidSubject)
      : null;

  return new NotificationService(
    prefsRepo,
    logRepo,
    emailTransport,
    userRepo,
    vapidTransport,
    pushSubRepo,
  );
}

// Lazy singleton — Worker is created on first call, not at module load time
let _worker: Worker | null = null;

export function startNotificationsWorker(): Worker {
  if (_worker) return _worker;

  const service = createNotificationService();

  _worker = new Worker(
    'notifications',
    async (job) => {
      switch (job.name) {
        case 'wall.message_posted': {
          const { profileId, authorId } = job.data as {
            profileId: string;
            authorId: string | null;
            messageId: string;
          };
          await service.handleWallMessagePosted(profileId, authorId);
          break;
        }

        case 'friendship_accepted': {
          const { recipientId, actorId } = job.data as {
            type: 'friendship_accepted';
            recipientId: string;
            actorId: string;
            friendshipId: string;
          };
          await service.handleFriendshipAccepted(recipientId, actorId);
          break;
        }

        case 'birthday.reminder': {
          const data = job.data as BirthdayReminderJob;
          const {
            recipientId,
            birthdayPersonId,
            birthdayPersonName,
            birthdayPersonUsername,
            daysUntil,
            birthMonthDay,
            reminderType,
          } = data;

          const currentYear = DateTime.utc().year;
          const logRepo = new (await import('../modules/notifications/notification-log.repository.js')).DrizzleNotificationLogRepository();

          // Get recipient preferences
          const prefsRepo = new DrizzleNotificationPreferencesRepository();
          const prefs = await prefsRepo.getByUserId(recipientId);
          const emailPref = prefs.find((p) => p.channel === 'email');
          const pushPref = prefs.find((p) => p.channel === 'push');

          const recipient = await new UserRepository().findById(recipientId);
          if (!recipient) break;

          // Email delivery
          if (emailPref?.enabled) {
            const alreadySentEmail = await logRepo.existsForYear(
              recipientId, birthdayPersonId, 'email', reminderType, currentYear,
            );
            if (!alreadySentEmail) {
              try {
                const apiKey = process.env['RESEND_API_KEY'] ?? '';
                const fromEmail = process.env['RESEND_FROM_EMAIL'] ?? 'noreply@parabuains.com';
                const emailTransport = new EmailTransport(apiKey, fromEmail);
                await emailTransport.sendBirthdayReminder({
                  to: recipient.email,
                  recipientName: recipient.displayName,
                  birthdayPersonName,
                  daysUntil,
                  birthMonthDay,
                });
                await logRepo.create({
                  recipientId, subjectId: birthdayPersonId,
                  channel: 'email', reminderType, status: 'sent',
                });
              } catch (err) {
                await logRepo.create({
                  recipientId, subjectId: birthdayPersonId,
                  channel: 'email', reminderType, status: 'failed',
                  errorMessage: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }

          // Push delivery
          const vapidPublicKey = process.env['VAPID_PUBLIC_KEY'];
          const vapidPrivateKey = process.env['VAPID_PRIVATE_KEY'];
          const vapidSubject = process.env['VAPID_SUBJECT'] ?? 'mailto:admin@parabuains.com';
          if (pushPref?.enabled && vapidPublicKey && vapidPrivateKey) {
            const alreadySentPush = await logRepo.existsForYear(
              recipientId, birthdayPersonId, 'push', reminderType, currentYear,
            );
            if (!alreadySentPush) {
              try {
                const vapidTransport = new VapidTransport(vapidPublicKey, vapidPrivateKey, vapidSubject);
                const pushSubRepo = new DrizzlePushSubscriptionRepository();
                const subs = await pushSubRepo.findByUserId(recipientId);
                const title = daysUntil === 0
                  ? `Hoje é o aniversário de ${birthdayPersonName}!`
                  : `Aniversário de ${birthdayPersonName} em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`;
                for (const sub of subs) {
                  const result = await vapidTransport.sendPushNotification(sub, {
                    title,
                    body: `Acesse o Parabuains para enviar seus parabéns!`,
                    url: `/${birthdayPersonUsername}`,
                  });
                  if (result === 'invalid_endpoint') {
                    await pushSubRepo.deleteByEndpoint(sub.endpoint);
                  }
                }
                await logRepo.create({
                  recipientId, subjectId: birthdayPersonId,
                  channel: 'push', reminderType, status: 'sent',
                });
              } catch (err) {
                await logRepo.create({
                  recipientId, subjectId: birthdayPersonId,
                  channel: 'push', reminderType, status: 'failed',
                  errorMessage: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }
          break;
        }

        default:
          // Unknown job types are silently skipped
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );

  _worker.on('failed', (job, err) => {
    console.error(`[NotificationsWorker] Job ${job?.id} (${job?.name}) failed:`, err);
  });

  console.info('[NotificationsWorker] Started');
  return _worker;
}

import { Worker } from 'bullmq';
import { getRedis } from '../infrastructure/redis.js';
import { NotificationService } from '../modules/notifications/notification.service.js';
import { DrizzleNotificationPreferencesRepository } from '../modules/notifications/notification-preferences.repository.js';
import { DrizzleNotificationLogRepository } from '../modules/notifications/notification-log.repository.js';
import { EmailTransport } from '../modules/notifications/email.transport.js';
import { UserRepository } from '../modules/users/user.repository.js';

function createNotificationService(): NotificationService {
  const prefsRepo = new DrizzleNotificationPreferencesRepository();
  const logRepo = new DrizzleNotificationLogRepository();
  const userRepo = new UserRepository();

  const apiKey = process.env['RESEND_API_KEY'] ?? '';
  const fromEmail = process.env['RESEND_FROM_EMAIL'] ?? 'noreply@parabuains.com';
  const emailTransport = new EmailTransport(apiKey, fromEmail);

  return new NotificationService(prefsRepo, logRepo, emailTransport, userRepo);
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

        default:
          // Unknown job types are silently skipped — Phase 6-03 will add more
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

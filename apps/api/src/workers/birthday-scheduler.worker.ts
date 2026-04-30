import { Worker } from 'bullmq';
import { DateTime } from 'luxon';
import { getRedis } from '../infrastructure/redis.js';
import { getNotificationsQueue } from '../queues/notifications.queue.js';
import { DrizzleBirthdaySchedulerRepository } from '../modules/notifications/birthday-scheduler.repository.js';
import { DrizzleNotificationLogRepository } from '../modules/notifications/notification-log.repository.js';

export interface BirthdayReminderJob {
  type: 'birthday.reminder';
  recipientId: string;
  birthdayPersonId: string;
  birthdayPersonName: string;
  birthdayPersonUsername: string;
  daysUntil: number;
  birthMonthDay: string; // "MM-DD"
  reminderType: 'D7' | 'D3' | 'D1' | 'Dday';
}

const REMINDER_DAYS: ReadonlyArray<{ days: number; type: BirthdayReminderJob['reminderType'] }> = [
  { days: 7, type: 'D7' },
  { days: 3, type: 'D3' },
  { days: 1, type: 'D1' },
  { days: 0, type: 'Dday' },
];

// Lazy singleton
let _schedulerWorker: Worker | null = null;

export function startBirthdaySchedulerWorker(): Worker {
  if (_schedulerWorker) return _schedulerWorker;

  const birthdayRepo = new DrizzleBirthdaySchedulerRepository();
  const logRepo = new DrizzleNotificationLogRepository();

  // Register the repeatable daily scan job (idempotent — BullMQ deduplicates by jobId)
  // We do this lazily on first startBirthdaySchedulerWorker() call
  void getNotificationsQueue()
    .add('birthday.scan', {}, {
      repeat: { pattern: '0 0 * * *' }, // midnight UTC daily
      jobId: 'birthday-daily-scan',
    })
    .catch((err: unknown) => {
      console.error('[BirthdayScheduler] Failed to register repeatable job:', err);
    });

  _schedulerWorker = new Worker(
    'notifications',
    async (job) => {
      if (job.name !== 'birthday.scan') return;

      console.info('[BirthdayScheduler] Running daily birthday scan...');

      // 8-day window covers all timezones for 7-day reminders
      const pairs = await birthdayRepo.getUpcomingBirthdayPairs(8);

      const currentYear = DateTime.utc().year;
      let enqueued = 0;

      for (const { recipient, birthdayPerson } of pairs) {
        const birthDateStr = birthdayPerson.birthDate;
        const parts = birthDateStr.split('-');
        const month = parseInt(parts[1]!, 10);
        const day = parseInt(parts[2]!, 10);

        // Calculate daysUntil in the RECIPIENT's timezone
        const now = DateTime.now().setZone(recipient.timezone);
        let nextBirthday = DateTime.fromObject(
          { year: now.year, month, day },
          { zone: recipient.timezone },
        );

        if (!nextBirthday.isValid) {
          // Feb 29 in non-leap year → use March 1
          nextBirthday = DateTime.fromObject(
            { year: now.year, month: 3, day: 1 },
            { zone: recipient.timezone },
          );
        }

        if (nextBirthday.startOf('day') < now.startOf('day')) {
          nextBirthday = nextBirthday.plus({ years: 1 });
        }

        const daysUntil = Math.round(
          nextBirthday.startOf('day').diff(now.startOf('day'), 'days').days,
        );

        // Find which reminder type applies today
        const reminder = REMINDER_DAYS.find((r) => r.days === daysUntil);
        if (!reminder) continue; // Not a configured reminder day

        // Idempotency: skip if already sent this year
        const alreadySent = await logRepo.existsForYear(
          recipient.userId,
          birthdayPerson.userId,
          'email', // check either channel — if sent, skip all
          reminder.type,
          currentYear,
        );
        if (alreadySent) continue;

        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');

        await getNotificationsQueue().add('birthday.reminder', {
          type: 'birthday.reminder',
          recipientId: recipient.userId,
          birthdayPersonId: birthdayPerson.userId,
          birthdayPersonName: birthdayPerson.displayName,
          birthdayPersonUsername: birthdayPerson.username,
          daysUntil,
          birthMonthDay: `${monthStr}-${dayStr}`,
          reminderType: reminder.type,
        } satisfies BirthdayReminderJob);

        enqueued++;
      }

      console.info(`[BirthdayScheduler] Enqueued ${enqueued} birthday reminder jobs`);
    },
    {
      connection: getRedis(),
      concurrency: 1, // birthday scan runs serially
    },
  );

  _schedulerWorker.on('failed', (job, err) => {
    console.error(`[BirthdayScheduler] Job ${job?.id} (${job?.name}) failed:`, err);
  });

  console.info('[BirthdayScheduler] Started — daily cron at midnight UTC');
  return _schedulerWorker;
}

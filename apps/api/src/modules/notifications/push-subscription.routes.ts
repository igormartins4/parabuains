import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DrizzlePushSubscriptionRepository } from './push-subscription.repository.js';
import { DrizzleNotificationPreferencesRepository } from './notification-preferences.repository.js';
import { DrizzleNotificationLogRepository } from './notification-log.repository.js';
import { EmailTransport } from './email.transport.js';
import { VapidTransport } from './vapid.transport.js';
import { NotificationService } from './notification.service.js';
import { UserRepository } from '../users/user.repository.js';

const subscribeBodySchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

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

export async function pushSubscriptionRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createNotificationService();

  /**
   * POST /push-subscriptions
   * Save a Web Push subscription for the authenticated user.
   */
  fastify.post<{ Body: z.infer<typeof subscribeBodySchema> }>(
    '/push-subscriptions',
    {},
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const parsed = subscribeBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid subscription payload',
          issues: parsed.error.issues,
        });
      }

      const { endpoint, keys } = parsed.data;
      const userAgent = (request.headers['user-agent'] as string | undefined) ?? undefined;

      await service.savePushSubscription(request.userId, {
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent,
      });

      return reply.code(201).send({ subscribed: true });
    },
  );

  /**
   * DELETE /push-subscriptions/:endpoint
   * Remove a push subscription by endpoint (URL-encoded).
   */
  fastify.delete<{ Params: { endpoint: string } }>(
    '/push-subscriptions/:endpoint',
    {},
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const endpoint = decodeURIComponent(request.params.endpoint);
      await service.deletePushSubscription(endpoint);
      return reply.code(204).send();
    },
  );
}

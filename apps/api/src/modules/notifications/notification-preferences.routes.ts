import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRepository } from '../users/user.repository.js';
import { EmailTransport } from './email.transport.js';
import { NotificationService } from './notification.service.js';
import { DrizzleNotificationLogRepository } from './notification-log.repository.js';
import { DrizzleNotificationPreferencesRepository } from './notification-preferences.repository.js';

const updatePreferenceSchema = z.object({
  channel: z.enum(['email', 'push']),
  daysBefore: z.array(z.number().int().min(0)),
  enabled: z.boolean(),
});

export async function notificationPreferencesRoutes(fastify: FastifyInstance): Promise<void> {
  const prefsRepo = new DrizzleNotificationPreferencesRepository();
  const logRepo = new DrizzleNotificationLogRepository();
  const userRepo = new UserRepository();
  const apiKey = process.env.RESEND_API_KEY ?? '';
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@parabuains.com';
  const emailTransport = new EmailTransport(apiKey, fromEmail);
  const service = new NotificationService(prefsRepo, logRepo, emailTransport, userRepo);

  /**
   * GET /users/me/notification-preferences
   * Returns all notification preferences for the authenticated user.
   */
  fastify.get('/users/me/notification-preferences', {}, async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const preferences = await service.getPreferences(request.userId);
    return reply.send({ preferences });
  });

  /**
   * PUT /users/me/notification-preferences
   * Upsert a notification preference for the authenticated user.
   */
  fastify.put<{ Body: z.infer<typeof updatePreferenceSchema> }>(
    '/users/me/notification-preferences',
    {},
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const parsed = updatePreferenceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          issues: parsed.error.issues,
        });
      }

      const { channel, daysBefore, enabled } = parsed.data;
      const preference = await service.upsertPreference(
        request.userId,
        channel,
        daysBefore,
        enabled
      );

      return reply.send({ preference });
    }
  );
}

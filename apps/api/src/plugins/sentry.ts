import * as Sentry from '@sentry/node';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../errors.js';

/**
 * Global error handler: captures unexpected 5xx errors to Sentry.
 * AppErrors (business logic) are NOT sent to Sentry — they're expected.
 */
export default fp(async function sentryPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    // Business logic errors — don't capture
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }

    // Fastify validation errors (400) — don't capture
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode ?? 500;
    if (statusCode < 500) {
      reply.code(statusCode).send({ error: 'ERROR', message: err.message ?? 'Request error' });
      return;
    }

    // Unexpected server errors — capture to Sentry
    Sentry.withScope((scope) => {
      scope.setUser({ id: request.userId ?? undefined });
      scope.setTag('route', request.routeOptions?.url ?? request.url);
      Sentry.captureException(error);
    });

    app.log.error({ err: error, reqId: request.id }, 'Unhandled server error');
    reply
      .code(500)
      .send({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  });
});

import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[sentry] SENTRY_DSN not set — error tracking disabled in production');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // PII scrubbing — never send passwords or tokens
    beforeSend(event) {
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        if (data.password) data.password = '[Filtered]';
        if (data.totpCode) data.totpCode = '[Filtered]';
      }
      return event;
    },
  });
}

import { buildApp } from './app.js';
import { initSentry } from './sentry.js';
import { startBirthdaySchedulerWorker } from './workers/birthday-scheduler.worker.js';
import { startNotificationsWorker } from './workers/notifications.worker.js';

// Initialize Sentry before anything else
initSentry();

const PORT = parseInt(process.env.API_PORT ?? '3001', 10);
const HOST = process.env.API_HOST ?? '0.0.0.0';

async function start() {
  const app = await buildApp();

  // Start background workers (lazy — connect to Redis only on first use)
  startNotificationsWorker();
  startBirthdaySchedulerWorker();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API running at http://localhost:${PORT}`);
    console.log(`Swagger UI at http://localhost:${PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

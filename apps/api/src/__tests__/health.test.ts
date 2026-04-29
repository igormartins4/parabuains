import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

// Mock environment variables for test
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['API_JWT_SECRET'] = 'test-secret-minimum-32-chars-long!!';
process.env['NODE_ENV'] = 'test';

describe('Health route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers the /v1/health route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });
    // Accept 200 (infra available) or 503 (infra unavailable in test env)
    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body) as { status: string; db: string; redis: string };
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('redis');
  });

  it('returns JSON content-type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

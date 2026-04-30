import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build-time config
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI, // only print in CI
  // Source maps: upload only in production builds
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
  // Disable Sentry telemetry
  telemetry: false,
  // Don't fail build if Sentry token missing
  errorHandler: (err: Error) => {
    console.warn('[sentry] Build plugin error (non-fatal):', err.message);
  },
});

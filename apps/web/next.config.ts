import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

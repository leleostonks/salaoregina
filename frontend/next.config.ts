import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') return [];
    const api = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
    return [
      { source: '/health', destination: `${api}/health` },
      { source: '/api/:path*', destination: `${api}/api/:path*` },
    ];
  },
};

export default nextConfig;

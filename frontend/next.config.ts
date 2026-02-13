import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  async rewrites() {
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
    const apiOrigin = apiBaseUrl.replace(/\/api$/, '');

    // If apiBaseUrl is relative (e.g. "/api"), don't rewrite to avoid loops.
    const isAbsolute = /^https?:\/\//i.test(apiBaseUrl);
    if (!isAbsolute) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/:path*`,
      },
      {
        source: '/health',
        destination: `${apiOrigin}/health`,
      },
    ];
  },
};

export default nextConfig;

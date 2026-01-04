import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongodb'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
      },
    ],
  },
  // Add empty turbopack config to silence the warning
  turbopack: {},
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Increase body parser size limit for GPX uploads (Vercel max is 4.5MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;

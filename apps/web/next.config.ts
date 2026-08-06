import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // required for the Docker build (apps/web/Dockerfile)
};

export default nextConfig;

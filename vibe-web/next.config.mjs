import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.STATIC_EXPORT ? 'export' : undefined,
  trailingSlash: process.env.STATIC_EXPORT ? true : false,
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: process.env.STATIC_EXPORT ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

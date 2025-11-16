/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use process.cwd() instead of __dirname (ESM scope) to silence multi-lockfile warning
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

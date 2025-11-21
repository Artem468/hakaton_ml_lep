import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        //TODO: убрать при проде и заменить на реальный домен
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/ml-media/**',
      },
    ],
  },
};

export default nextConfig;
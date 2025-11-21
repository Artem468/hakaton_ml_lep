import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'intangibly-tender-bobwhite.cloudpub.ru',
        port: '',
        pathname: '/ml-media/**',
      },
    ],
  },
};

export default nextConfig;

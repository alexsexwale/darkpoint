import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cf.cjdropshipping.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cjdropshipping.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cjdropshipping.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.cjdropshipping.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

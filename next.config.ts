import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Target modern browsers to reduce polyfills and optimize CSS
  experimental: {
    optimizePackageImports: ['framer-motion', 'gsap', '@supabase/supabase-js'],
    optimizeCss: true, // Inline critical CSS for faster FCP/LCP
  },
  images: {
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
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
      // Supabase Storage for avatars and assets
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
  // Headers for PS2 emulator - SharedArrayBuffer requires cross-origin isolation
  async headers() {
    return [
      {
        // Apply COOP/COEP headers to PS2 emulator page (required for SharedArrayBuffer)
        source: '/arcade/ps2',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // Play.js needs both headers and correct content type
        source: '/Play.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/Play.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/Play.worker.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

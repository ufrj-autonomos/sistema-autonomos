import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  poweredByHeader: false,
  async headers() {
    const production = process.env.NODE_ENV === 'production';
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src 'self'${production ? '' : ' ws: wss:'}`,
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      ...(production ? ['upgrade-insecure-requests'] : []),
    ].join('; ');
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
      ],
    }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

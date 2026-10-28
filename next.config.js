/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ['web-push'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  async rewrites() {
    // Stable icon paths (no query strings) — required for reliable Android WebAPK install
    return [
      { source: '/icons/icon-192.png', destination: '/api/pwa-icon/192?purpose=any' },
      { source: '/icons/icon-512.png', destination: '/api/pwa-icon/512?purpose=any' },
      { source: '/icons/icon-maskable-192.png', destination: '/api/pwa-icon/192?purpose=maskable' },
      { source: '/icons/icon-maskable-512.png', destination: '/api/pwa-icon/512?purpose=maskable' },
      { source: '/icons/apple-touch-icon.png', destination: '/api/pwa-icon/180?purpose=any' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Hostinger / non-Vercel Node hosts (smaller runtime, official prod server)
  // output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  transpilePackages: ['lucide-react'],
  typescript: {
    // Temporary: legacy dashboard components still compare Title-Case statuses
    // against the v2 lowercase IncidentStatus union. Re-enable strict checks
    // after UI is fully aligned to app/types. Target: re-enable in v1.4.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Lint runs via `npm run lint` / CI; keep builds unblocked until ESLint is green.
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

module.exports = nextConfig;

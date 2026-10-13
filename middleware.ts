import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * BIKA v2 — Edge security.
 *
 * - Blocks public self-signup routes (officials only, provisioned by Super Admin)
 * - Security headers with a CSP tight enough to be meaningful
 * - HSTS for HTTPS deployments
 * - Redirects legacy v1 routes to their v2 equivalents
 */

const LEGACY_REDIRECTS: Record<string, string> = {
  '/portal': '/report',
  '/citizen': '/report',
  '/public': '/report',
  '/dashboard': '/officer',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block self-signup
  if (
    pathname.startsWith('/signup') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth/sign-up') ||
    pathname.startsWith('/auth/signup')
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Legacy route redirects
  const legacy = LEGACY_REDIRECTS[pathname];
  if (legacy) {
    return NextResponse.redirect(new URL(legacy, request.url));
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self)'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // HSTS — 1 year once on HTTPS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // CSP — tightened from v1:
  //   - removed 'unsafe-eval' (Next.js 15 doesn't need it in prod)
  //   - removed http: from img-src (mixed content protection)
  //   - removed raw.githubusercontent.com (unused)
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://unpkg.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|Bika|manifest.json|sw.js|geo/).*)',
  ],
};

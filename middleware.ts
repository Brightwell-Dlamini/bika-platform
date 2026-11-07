import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Coming-soon gate
 * ----------------
 * BIKA_COMING_SOON=1|true  → public traffic rewritten to /coming-soon
 * BIKA_COMING_SOON=0|false → live site (default off if unset? we default ON)
 *
 * Ops paths stay open so staff can still train and go-live.
 * To launch: set BIKA_COMING_SOON=0 (or remove the env) and redeploy.
 * Optionally delete app/(coming-soon)/ later — zero impact on other layouts.
 */
function comingSoonEnabled() {
  const v = (process.env.BIKA_COMING_SOON ?? '1').toLowerCase().trim();
  return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

/** Paths that must stay reachable while the public site is gated. */
function isExempt(path: string) {
  if (path === '/coming-soon') return true;
  if (path.startsWith('/coming-soon/')) return true;

  // Auth + ops
  if (path === '/login' || path.startsWith('/login/')) return true;
  if (path.startsWith('/officer')) return true;
  if (path.startsWith('/admin')) return true;
  if (path.startsWith('/command')) return true;
  if (path.startsWith('/analytics')) return true;
  if (path.startsWith('/profile')) return true;

  // Platform plumbing
  if (path.startsWith('/api/')) return true;
  if (path.startsWith('/_next/')) return true;
  if (path.startsWith('/icons/')) return true;
  if (path === '/sw.js') return true;
  if (path === '/manifest.json' || path === '/manifest.webmanifest') return true;
  if (path === '/Bika.png' || path === '/favicon.ico') return true;
  if (path.startsWith('/images/')) return true;

  return false;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // --- Coming soon gate (rewrite keeps URL as / for visitors) ---
  if (comingSoonEnabled() && !isExempt(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    // Preserve query only for debugging; public sees clean placeholder
    return NextResponse.rewrite(url);
  }

  // --- Existing PWA header fixes (Hostinger often ignores next.config headers) ---
  const res = NextResponse.next();

  if (path === '/sw.js') {
    res.headers.set('Content-Type', 'application/javascript; charset=utf-8');
    res.headers.set('Service-Worker-Allowed', '/');
    res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  if (path === '/manifest.webmanifest' || path === '/manifest.json') {
    res.headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
    res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  if (path.startsWith('/icons/') && path.endsWith('.png')) {
    res.headers.set('Cache-Control', 'public, max-age=86400');
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static file extensions Next already optimizes.
     * Coming-soon gate needs broad coverage; exempt list handles ops/api.
     */
    '/((?!_next/static|_next/image).*)',
  ],
};

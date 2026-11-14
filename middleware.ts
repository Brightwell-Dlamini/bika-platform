import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Coming-soon gate (optional)
 * ---------------------------
 * BIKA_COMING_SOON=1|true  → every app route → /coming-soon
 * BIKA_COMING_SOON=0|false → live site (default)
 *
 * Live mode is the default. Set the env only when you need to gate the site again.
 * Placeholder route remains at app/(coming-soon)/coming-soon for optional reuse.
 */
function comingSoonEnabled() {
  const v = (process.env.BIKA_COMING_SOON ?? '0').toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

/** Absolute minimum so the coming-soon page can load when gated. */
function isAssetExempt(path: string) {
  if (path === '/coming-soon') return true;
  if (path.startsWith('/coming-soon/')) return true;

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

  if (comingSoonEnabled() && !isAssetExempt(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    url.search = '';
    return NextResponse.rewrite(url);
  }

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
  matcher: ['/((?!_next/static|_next/image).*)'],
};

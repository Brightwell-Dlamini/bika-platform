import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Hostinger/node hosts often ignore next.config.js headers().
 * Force correct MIME + SW scope headers here.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
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
  matcher: ['/sw.js', '/manifest.json', '/manifest.webmanifest', '/icons/:path*'],
};

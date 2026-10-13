/**
 * Simple in-memory rate limiter for API routes.
 *
 * Suitable for single-instance / edge-compatible deployments.
 * Before multi-instance production scale, replace the Map store with a shared
 * backend (e.g. Upstash Redis or Vercel KV) while keeping the same interface.
 */

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 6;

const hits = new Map<string, { count: number; reset: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
}

export function rateLimit(
  key: string,
  maxPerWindow: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup to avoid unbounded growth
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (now > v.reset) hits.delete(k);
    }
  }

  const entry = hits.get(key);
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerWindow - 1 };
  }

  if (entry.count >= maxPerWindow) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.reset - now) / 1000),
      remaining: 0,
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxPerWindow - entry.count };
}

/** Prefer x-forwarded-for (first hop) then x-real-ip. */
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip') || 'unknown';
}

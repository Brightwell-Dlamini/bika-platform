/**
 * Rate limiter for API routes.
 *
 * Default: in-memory (single instance).
 * Production multi-instance: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * for a shared fixed-window counter via Upstash REST API.
 */

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 6;

const hits = new Map<string, { count: number; reset: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
  backend: 'memory' | 'upstash';
}

function memoryLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (now > v.reset) hits.delete(k);
    }
  }

  const entry = hits.get(key);
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerWindow - 1, backend: 'memory' };
  }

  if (entry.count >= maxPerWindow) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.reset - now) / 1000),
      remaining: 0,
      backend: 'memory',
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxPerWindow - entry.count, backend: 'memory' };
}

async function upstashLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `bika:rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    // INCR then EXPIRE on first hit
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = Number(incrJson.result ?? 0);

    if (count === 1) {
      await fetch(`${url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
    }

    if (count > maxPerWindow) {
      return {
        allowed: false,
        retryAfter: windowSec,
        remaining: 0,
        backend: 'upstash',
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxPerWindow - count),
      backend: 'upstash',
    };
  } catch {
    return null;
  }
}

/** Sync rate limit (memory). Prefer rateLimitAsync when Upstash may be configured. */
export function rateLimit(
  key: string,
  maxPerWindow: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  return memoryLimit(key, maxPerWindow, windowMs);
}

/** Async rate limit — uses Upstash when configured, else memory. */
export async function rateLimitAsync(
  key: string,
  maxPerWindow: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
  const remote = await upstashLimit(key, maxPerWindow, windowMs);
  if (remote) return remote;
  return memoryLimit(key, maxPerWindow, windowMs);
}

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip') || 'unknown';
}

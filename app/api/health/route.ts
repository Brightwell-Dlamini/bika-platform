import { NextResponse } from 'next/server';
import { getEnvHealth, hasServiceRole } from '@/app/lib/env';
import { createServiceSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PLATFORM_VERSION = '5.6.1';

export async function GET() {
  const health = getEnvHealth();
  let db: { ok: boolean; latencyMs: number | null; error?: string } = {
    ok: false,
    latencyMs: null,
  };

  if (hasServiceRole()) {
    const t0 = Date.now();
    try {
      const supabase = createServiceSupabase();
      const { error } = await supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      const latencyMs = Date.now() - t0;
      if (error) {
        db = { ok: false, latencyMs, error: error.message.slice(0, 120) };
      } else {
        db = { ok: true, latencyMs };
      }
    } catch (err) {
      db = {
        ok: false,
        latencyMs: Date.now() - t0,
        error: String(err).slice(0, 120),
      };
    }
  }

  const overallOk = health.ok && (db.ok || !hasServiceRole());
  const redisConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

  return NextResponse.json(
    {
      status: overallOk ? 'ok' : 'degraded',
      service: 'bika-platform',
      version: PLATFORM_VERSION,
      ux: '5.6',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        ...health,
        database: db,
        rateLimitBackend: redisConfigured ? 'upstash' : 'memory',
        cronSecretConfigured: Boolean(
          process.env.CRON_SECRET || process.env.USSD_WEBHOOK_SECRET
        ),
      },
    },
    {
      status: overallOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

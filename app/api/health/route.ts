import { NextResponse } from 'next/server';
import { getEnvHealth, hasServiceRole } from '@/app/lib/env';
import { createServiceSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLATFORM_VERSION = '6.2.1';

export async function GET() {
  const health = getEnvHealth();
  let db: { ok: boolean; latencyMs: number | null; error?: string } = {
    ok: false,
    latencyMs: null,
  };
  let notificationsTable: { ok: boolean; error?: string } = { ok: false };

  if (hasServiceRole()) {
    const t0 = Date.now();
    try {
      const supabase = createServiceSupabase();
      const { error } = await supabase.from('incidents').select('id').limit(1).maybeSingle();
      const latencyMs = Date.now() - t0;
      if (error) {
        db = { ok: false, latencyMs, error: error.message.slice(0, 120) };
      } else {
        db = { ok: true, latencyMs };
      }

      const { error: nErr } = await supabase
        .from('notifications')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (nErr) {
        notificationsTable = { ok: false, error: nErr.message.slice(0, 120) };
      } else {
        notificationsTable = { ok: true };
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
      ux: '6.2',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        ...health,
        database: db,
        notificationsTable,
        rateLimitBackend: redisConfigured ? 'upstash' : 'memory',
      },
    },
    {
      status: overallOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

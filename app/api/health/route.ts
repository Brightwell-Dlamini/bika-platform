import { NextResponse } from 'next/server';
import { getEnvHealth } from '@/app/lib/env';

export const dynamic = 'force-dynamic';

const PLATFORM_VERSION = '5.0.0';

export async function GET() {
  const health = getEnvHealth();
  return NextResponse.json(
    {
      status: health.ok ? 'ok' : 'degraded',
      service: 'bika-platform',
      version: PLATFORM_VERSION,
      ux: '5.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: health,
    },
    {
      status: health.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

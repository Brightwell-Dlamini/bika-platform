import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunWork } from '@/app/lib/rbac';
import type { ApiResponse, Region } from '@/app/types';
import type { RegionBreakdown, AnalyticsRange } from '@/app/types/analytics';

export const dynamic = 'force-dynamic';

const RANGE_MS: Record<AnalyticsRange, number | null> = {
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
  '90d': 90 * 86_400_000,
  'year': 365 * 86_400_000,
  'all': null,
};

const REGIONS: Region[] = ['Hhohho', 'Manzini', 'Shiselweni', 'Lubombo'];

const querySchema = z.object({
  range: z.enum(['24h', '7d', '30d', '90d', 'year', 'all']).default('30d'),
});

export async function GET(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || !canRunWork(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Admin required.' };
    return NextResponse.json(body, { status: 403 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    const body: ApiResponse<never> = { ok: false, code: 'VALIDATION_FAILED', error: 'Invalid range.' };
    return NextResponse.json(body, { status: 400 });
  }
  const { range } = parsed.data;
  const since = RANGE_MS[range] !== null ? new Date(Date.now() - RANGE_MS[range]!).toISOString() : null;

  const supabase = createServiceSupabase();
  let q = supabase
    .from('incidents')
    .select('region, status, severity, sla_due_at, created_at, triaged_at, first_responded_at, resolved_at');
  if (since) q = q.gte('created_at', since);

  const { data, error } = await q;
  if (error) {
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  const now = Date.now();
  const breakdown: RegionBreakdown[] = REGIONS.map((region) => {
    const items = (data ?? []).filter((r) => r.region === region);
    let open = 0;
    let critical = 0;
    let slaOverdue = 0;
    let resolved = 0;
    const ackTimes: number[] = [];
    const resolveTimes: number[] = [];

    for (const r of items) {
      const isResolved = r.status === 'resolved' || r.status === 'closed';
      const isTerminal = r.status === 'closed' || r.status === 'rejected';

      if (!isTerminal && !isResolved) open++;
      if (r.severity === 'CRITICAL' && !isResolved && !isTerminal) critical++;
      if (isResolved) resolved++;
      if (r.sla_due_at && !isResolved && !isTerminal && new Date(r.sla_due_at).getTime() < now) {
        slaOverdue++;
      }
      if (r.first_responded_at && r.created_at) {
        const m = (new Date(r.first_responded_at).getTime() - new Date(r.created_at).getTime()) / 60000;
        if (m >= 0) ackTimes.push(m);
      }
      if (r.resolved_at && r.created_at) {
        const m = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 60000;
        if (m >= 0) resolveTimes.push(m);
      }
    }

    const avg = (arr: number[]): number | null =>
      arr.length === 0 ? null : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

    return {
      region,
      total: items.length,
      open,
      critical,
      slaOverdue,
      resolved,
      avgAckMins: avg(ackTimes),
      avgResolveMins: avg(resolveTimes),
      resolutionRate: items.length === 0 ? 0 : Math.round((resolved / items.length) * 100),
    };
  });

  const body: ApiResponse<{ regions: RegionBreakdown[] }> = {
    ok: true,
    data: { regions: breakdown },
  };
  return NextResponse.json(body);
}

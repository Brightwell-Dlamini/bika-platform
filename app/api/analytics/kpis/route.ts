import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunWork } from '@/app/lib/rbac';
import type { ApiResponse } from '@/app/types';
import type { KpiSummary, AnalyticsRange } from '@/app/types/analytics';

export const dynamic = 'force-dynamic';

const RANGE_MS: Record<AnalyticsRange, number | null> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  'year': 365 * 24 * 60 * 60 * 1000,
  'all': null,
};

const querySchema = z.object({
  range: z.enum(['24h', '7d', '30d', '90d', 'year', 'all']).default('30d'),
  region: z.string().optional(),
  agencyCode: z.string().optional(),
  mode: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || !canRunWork(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Admin or Super Admin required.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const { range, region, agencyCode, mode } = parsed.data;

  const supabase = createServiceSupabase();
  const since = RANGE_MS[range] !== null
    ? new Date(Date.now() - RANGE_MS[range]!).toISOString()
    : null;

  // Build base filter
  let q = supabase
    .from('incidents')
    .select(
      'id, status, severity, report_type, region, mode, sla_due_at, created_at, triaged_at, first_responded_at, resolved_at'
    );

  if (since) q = q.gte('created_at', since);
  if (region) q = q.eq('region', region);
  if (agencyCode) q = q.eq('assigned_agency_code', agencyCode);
  if (mode) q = q.eq('mode', mode);

  const { data: rows, error } = await q;
  if (error) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: error.message,
    };
    return NextResponse.json(body, { status: 500 });
  }

  // Compute KPIs in JS (fast for <50k rows; move to SQL functions if scale demands)
  const now = Date.now();
  const incidents = rows ?? [];

  let open = 0;
  let critical = 0;
  let slaOverdue = 0;
  let resolved = 0;
  let compliments = 0;
  let emergencies = 0;

  const ackTimes: number[] = [];
  const resolveTimes: number[] = [];

  for (const r of incidents) {
    const isTerminal = r.status === 'closed' || r.status === 'rejected';
    const isResolved = r.status === 'resolved' || r.status === 'closed';

    if (!isTerminal && r.status !== 'resolved') open++;
    if (r.severity === 'CRITICAL' && !isResolved && !isTerminal) critical++;
    if (isResolved) resolved++;
    if (r.report_type === 'compliment' || r.report_type === 'rating') compliments++;
    if (r.report_type === 'emergency') emergencies++;

    if (
      r.sla_due_at &&
      !isResolved &&
      !isTerminal &&
      new Date(r.sla_due_at).getTime() < now
    ) {
      slaOverdue++;
    }

    if (r.first_responded_at && r.created_at) {
      const mins = (new Date(r.first_responded_at).getTime() - new Date(r.created_at).getTime()) / 60000;
      if (mins >= 0) ackTimes.push(mins);
    }
    if (r.resolved_at && r.created_at) {
      const mins = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 60000;
      if (mins >= 0) resolveTimes.push(mins);
    }
  }

  const avg = (arr: number[]): number | null =>
    arr.length === 0 ? null : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

  const summary: KpiSummary = {
    range,
    total: incidents.length,
    open,
    critical,
    slaOverdue,
    resolved,
    resolutionRate: incidents.length === 0 ? 0 : Math.round((resolved / incidents.length) * 100),
    avgFirstResponseMins: avg(ackTimes),
    avgResolutionMins: avg(resolveTimes),
    compliments,
    emergencies,
  };

  const body: ApiResponse<KpiSummary> = { ok: true, data: summary };
  return NextResponse.json(body);
}

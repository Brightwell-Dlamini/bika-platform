import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunWork } from '@/app/lib/rbac';
import type { ApiResponse } from '@/app/types';
import type { TrendPoint } from '@/app/types/analytics';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  region: z.string().optional(),
  mode: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || !canRunWork(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Admin required.' };
    return NextResponse.json(body, { status: 403 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    const body: ApiResponse<never> = { ok: false, code: 'VALIDATION_FAILED', error: 'Invalid query.' };
    return NextResponse.json(body, { status: 400 });
  }
  const { days, region, mode } = parsed.data;

  const since = new Date(Date.now() - days * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const supabase = createServiceSupabase();
  let q = supabase
    .from('incidents')
    .select('created_at, resolved_at, sla_due_at, status')
    .gte('created_at', sinceIso);
  if (region) q = q.eq('region', region);
  if (mode) q = q.eq('mode', mode);

  const { data, error } = await q;
  if (error) {
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  // Bucket by day
  const buckets = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, submitted: 0, resolved: 0, slaBreaches: 0 });
  }

  const now = Date.now();
  for (const r of data ?? []) {
    const createdKey = (r.created_at as string).slice(0, 10);
    const b = buckets.get(createdKey);
    if (b) b.submitted++;

    if (r.resolved_at) {
      const resolvedKey = (r.resolved_at as string).slice(0, 10);
      const rb = buckets.get(resolvedKey);
      if (rb) rb.resolved++;
    }

    if (
      r.sla_due_at &&
      r.status !== 'closed' &&
      r.status !== 'resolved' &&
      r.status !== 'rejected' &&
      new Date(r.sla_due_at).getTime() < now
    ) {
      const breachKey = (r.sla_due_at as string).slice(0, 10);
      const sb = buckets.get(breachKey);
      if (sb) sb.slaBreaches++;
    }
  }

  const trends = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

  const body: ApiResponse<{ trends: TrendPoint[] }> = { ok: true, data: { trends } };
  return NextResponse.json(body);
}

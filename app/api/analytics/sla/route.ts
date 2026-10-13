import { NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunWork } from '@/app/lib/rbac';
import type { ApiResponse, Severity } from '@/app/types';
import type { SlaStats } from '@/app/types/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const caller = await getCallerProfile();
  if (!caller || !canRunWork(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Admin required.' };
    return NextResponse.json(body, { status: 403 });
  }

  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from('incidents')
    .select('severity, sla_due_at, status')
    .not('sla_due_at', 'is', null)
    .not('status', 'in', '(closed,resolved,rejected)');

  if (error) {
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  const now = Date.now();
  const stats: SlaStats = {
    totalOpen: data?.length ?? 0,
    overdue: 0,
    dueIn1h: 0,
    dueIn4h: 0,
    dueToday: 0,
    overdueBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
  };

  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);

  for (const r of data ?? []) {
    const due = new Date(r.sla_due_at as string).getTime();
    const diff = due - now;
    if (diff < 0) {
      stats.overdue++;
      stats.overdueBySeverity[r.severity as Severity] =
        (stats.overdueBySeverity[r.severity as Severity] ?? 0) + 1;
    } else {
      if (diff <= 60 * 60_000) stats.dueIn1h++;
      if (diff <= 4 * 60 * 60_000) stats.dueIn4h++;
      if (due <= endOfToday.getTime()) stats.dueToday++;
    }
  }

  const body: ApiResponse<SlaStats> = { ok: true, data: stats };
  return NextResponse.json(body);
}

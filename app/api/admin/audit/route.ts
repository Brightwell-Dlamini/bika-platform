import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunWork, isSuperAdmin } from '@/app/lib/rbac';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: string;
  createdAt: string;
  userId: string | null;
  userName: string;
  userRole: string | null;
  action: string;
  targetId: string | null;
  details: string | null;
}

export async function GET(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = { ok: false, code: 'UNAUTHORIZED', error: 'Authentication required.' };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunWork(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Admin or Super Admin only.' };
    return NextResponse.json(body, { status: 403 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 200), 1000);
  const targetId = req.nextUrl.searchParams.get('targetId');
  const action = req.nextUrl.searchParams.get('action');

  const admin = createServiceSupabase();
  let q = admin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Admins see only their own audit; Super Admin sees all
  if (!isSuperAdmin(caller.role)) {
    q = q.eq('user_id', caller.id);
  }
  if (targetId) q = q.eq('target_id', targetId);
  if (action) q = q.eq('action', action);

  const { data, error } = await q;
  if (error) {
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  const logs: AuditRow[] = (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    userId: r.user_id,
    userName: r.user_name,
    userRole: r.user_role,
    action: r.action,
    targetId: r.target_id,
    details: r.details,
  }));

  const body: ApiResponse<{ logs: AuditRow[] }> = { ok: true, data: { logs } };
  return NextResponse.json(body);
}

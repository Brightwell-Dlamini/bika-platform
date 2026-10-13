import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunSystem } from '@/app/lib/rbac';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = { ok: false, code: 'UNAUTHORIZED', error: 'Authentication required.' };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunSystem(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Super Admin only.' };
    return NextResponse.json(body, { status: 403 });
  }

  const admin = createServiceSupabase();
  const { error } = await admin.from('hotlines').delete().eq('id', id);

  if (error) {
    logger.error('hotline_delete_failed', { requestId, id, error: error.message });
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: 'DELETE_HOTLINE',
    target_id: id,
    details: `Deleted hotline ${id}`,
  });

  const body: ApiResponse<{ id: string }> = { ok: true, data: { id } };
  return NextResponse.json(body);
}

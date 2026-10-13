import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunSystem } from '@/app/lib/rbac';
import { zUpsertLogo } from '@/app/lib/schemas';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = { ok: false, code: 'UNAUTHORIZED', error: 'Authentication required.' };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunSystem(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Super Admin only.' };
    return NextResponse.json(body, { status: 403 });
  }

  let json: unknown;
  try { json = await req.json(); } catch {
    const body: ApiResponse<never> = { ok: false, code: 'INVALID_JSON', error: 'Invalid JSON.' };
    return NextResponse.json(body, { status: 400 });
  }

  const parsed = zUpsertLogo.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const input = parsed.data;

  const admin = createServiceSupabase();
  const { data, error } = await admin
    .from('system_logos')
    .upsert({
      id: input.id,
      name: input.name,
      subtitle: input.subtitle ?? null,
      acronym: input.acronym,
      role: input.role ?? null,
      custom_image_url: input.customImageUrl ?? null,
      badge_color: input.badgeColor ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('logo_upsert_failed', { requestId, error: error?.message });
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error?.message ?? 'Could not save logo.' };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: 'UPDATE_LOGO',
    target_id: input.id,
    details: `Updated logo ${input.acronym} — ${input.name}`,
  });

  const body: ApiResponse<{ logo: typeof data }> = { ok: true, data: { logo: data } };
  return NextResponse.json(body);
}

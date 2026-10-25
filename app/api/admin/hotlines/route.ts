import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canManageHotlines } from '@/app/lib/rbac';
import { zUpsertHotline } from '@/app/lib/schemas';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse, Hotline } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = { ok: false, code: 'UNAUTHORIZED', error: 'Authentication required.' };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canManageHotlines(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Admin or Super Admin required to manage hotlines.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    const body: ApiResponse<never> = { ok: false, code: 'INVALID_JSON', error: 'Invalid JSON.' };
    return NextResponse.json(body, { status: 400 });
  }

  const parsed = zUpsertHotline.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const input = parsed.data;
  const id = input.id ?? `hot-${Date.now()}`;

  const admin = createServiceSupabase();

  const { data, error } = await admin
    .from('hotlines')
    .upsert({
      id,
      name: input.name,
      number: input.number,
      category: input.category,
      description: input.description ?? null,
      agency_code: input.agencyCode ?? null,
      available_hours: input.availableHours,
      is_toll_free: input.isTollFree,
      priority: input.priority,
      active: input.active,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('hotline_upsert_failed', { requestId, error: error?.message });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: error?.message ?? 'Could not save hotline.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: input.id ? 'UPDATE_HOTLINE' : 'CREATE_HOTLINE',
    target_id: id,
    details: `${input.name} (${input.number})`,
  });

  const body: ApiResponse<{ hotline: Hotline }> = { ok: true, data: { hotline: mapHotline(data) } };
  return NextResponse.json(body, { status: input.id ? 200 : 201 });
}

function mapHotline(r: Record<string, unknown>): Hotline {
  return {
    id: r.id as string,
    name: r.name as string,
    number: r.number as string,
    category: r.category as Hotline['category'],
    description: (r.description as string | null) ?? null,
    agencyCode: (r.agency_code as Hotline['agencyCode']) ?? null,
    availableHours: r.available_hours as string,
    isTollFree: Boolean(r.is_toll_free),
    priority: Number(r.priority ?? 10),
    active: Boolean(r.active),
  };
}

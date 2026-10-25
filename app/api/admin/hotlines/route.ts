import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canManageHotlines } from '@/app/lib/rbac';
import { zUpsertHotline } from '@/app/lib/schemas';
import type { ApiResponse, Hotline } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const caller = await getCallerProfile();
  if (!caller || caller.role === 'public') {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const { data, error } = await supabase.from('hotlines').select('*').order('priority');
  if (error) {
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error.message };
    return NextResponse.json(body, { status: 500 });
  }

  const hotlines: Hotline[] = (data ?? []).map(mapHotline);
  const body: ApiResponse<{ hotlines: Hotline[] }> = { ok: true, data: { hotlines } };
  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
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
    const body: ApiResponse<never> = {
      ok: false,
      code: 'INVALID_JSON',
      error: 'Request body must be valid JSON.',
    };
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
  const supabase = createServiceSupabase();
  const row = {
    name: input.name,
    number: input.number,
    category: input.category,
    description: input.description ?? null,
    agency_code: input.agencyCode ?? null,
    available_hours: input.availableHours ?? '24/7',
    is_toll_free: input.isTollFree ?? false,
    priority: input.priority ?? 100,
    active: input.active ?? true,
  };

  const { data, error } = await supabase.from('hotlines').insert(row).select().single();
  if (error || !data) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: error?.message ?? 'Could not create hotline.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiResponse<{ hotline: Hotline }> = { ok: true, data: { hotline: mapHotline(data) } };
  return NextResponse.json(body, { status: 201 });
}

function mapHotline(r: Record<string, unknown>): Hotline {
  return {
    id: String(r.id),
    name: String(r.name),
    number: String(r.number),
    category: r.category as Hotline['category'],
    description: (r.description as string | null) ?? null,
    agencyCode: r.agency_code as Hotline['agencyCode'],
    availableHours: String(r.available_hours ?? '24/7'),
    isTollFree: Boolean(r.is_toll_free),
    priority: Number(r.priority ?? 100),
    active: Boolean(r.active),
  };
}

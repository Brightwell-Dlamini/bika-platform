import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import type { ApiResponse } from '@/app/types';
import type { NotificationRow } from '@/app/lib/notifications/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || isPublic(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 30), 100);
  const unreadOnly = req.nextUrl.searchParams.get('unread') === '1';

  const supabase = createServiceSupabase();
  let q = supabase
    .from('notifications')
    .select('id, title, body, href, incident_id, event_type, read_at, created_at')
    .eq('user_id', caller.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) q = q.is('read_at', null);

  const { data, error } = await q;
  if (error) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not load notifications.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', caller.id)
    .is('read_at', null);

  const items: NotificationRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    href: (r.href as string | null) ?? null,
    incidentId: (r.incident_id as string | null) ?? null,
    eventType: r.event_type as string,
    readAt: (r.read_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }));

  const body: ApiResponse<{ items: NotificationRow[]; unreadCount: number }> = {
    ok: true,
    data: { items, unreadCount: unreadCount ?? 0 },
  };
  return NextResponse.json(body);
}

const patchSchema = z.object({
  ids: z.array(z.string().min(1).max(80)).max(100).optional(),
  all: z.boolean().optional(),
});

/** Mark notifications as read. */
export async function PATCH(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || isPublic(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
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

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success || (!parsed.data.all && !(parsed.data.ids && parsed.data.ids.length))) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: 'Provide ids[] or all: true.',
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();
  let q = supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', caller.id)
    .is('read_at', null);

  if (!parsed.data.all && parsed.data.ids) {
    q = q.in('id', parsed.data.ids);
  }

  const { error } = await q;
  if (error) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not update notifications.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiResponse<{ ok: true }> = { ok: true, data: { ok: true } };
  return NextResponse.json(body);
}

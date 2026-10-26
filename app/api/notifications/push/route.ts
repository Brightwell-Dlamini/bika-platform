import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(20).max(500),
    auth: z.string().min(8).max(200),
  }),
});

/** Register or refresh a Web Push subscription for the signed-in officer. */
export async function POST(req: NextRequest) {
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

  const parsed = subscribeSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = createServiceSupabase();
  const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null;
  const now = new Date().toISOString();

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: caller.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: ua,
      updated_at: now,
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not save push subscription.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiResponse<{ subscribed: true }> = { ok: true, data: { subscribed: true } };
  return NextResponse.json(body);
}

const unsubSchema = z.object({
  endpoint: z.string().url().max(2000),
});

/** Remove a push subscription. */
export async function DELETE(req: NextRequest) {
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

  const parsed = unsubSchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: 'endpoint is required.',
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = createServiceSupabase();
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', caller.id)
    .eq('endpoint', parsed.data.endpoint);

  const body: ApiResponse<{ unsubscribed: true }> = {
    ok: true,
    data: { unsubscribed: true },
  };
  return NextResponse.json(body);
}

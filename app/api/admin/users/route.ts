import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canManageUsers, canAssignRole, isSuperAdmin, isAdmin } from '@/app/lib/rbac';
import { zCreateUser } from '@/app/lib/schemas';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse, User } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || caller.role === 'public') {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Officer authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const agencyCode = params.get('agencyCode');
  const role = params.get('role');
  const region = params.get('region');
  const activeParam = params.get('active');

  const supabase = createServiceSupabase();
  let q = supabase.from('profiles').select('*').order('name');

  // Super Admin / Admin: full staff directory (optional agency filter).
  if (agencyCode) {
    q = q.eq('agency_code', agencyCode);
  } else if (!isSuperAdmin(caller.role) && !isAdmin(caller.role) && caller.agencyCode) {
    q = q.eq('agency_code', caller.agencyCode);
  }

  if (role) q = q.eq('role', role);
  if (region) q = q.eq('region', region);
  if (activeParam === 'true') q = q.eq('active', true);
  if (activeParam === 'false') q = q.eq('active', false);

  // Never return pure public citizen profiles in officer directory
  q = q.neq('role', 'public');

  const { data, error } = await q;
  if (error) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: error.message,
    };
    return NextResponse.json(body, { status: 500 });
  }

  const users: User[] = (data ?? []).map(mapUser);
  const body: ApiResponse<{ users: User[] }> = { ok: true, data: { users } };
  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canManageUsers(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Admin or Super Admin required to create users.',
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

  const parsed = zCreateUser.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
      details: parsed.error.flatten(),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const input = parsed.data;

  if (!canAssignRole(caller.role, input.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'You cannot assign the requested role.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  if (isAdmin(caller.role) && !isSuperAdmin(caller.role) && input.role === 'super_admin') {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Only Super Admins can create Super Admin accounts.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  const normalizedEmail = input.email.toLowerCase().trim();
  const profileId = input.id ?? `usr-${Date.now()}`;

  const admin = createServiceSupabase();

  let authUserId: string;

  const { data: existing } = await admin
    .from('profiles')
    .select('auth_user_id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (existing?.auth_user_id) {
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.auth_user_id, {
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name,
        role: input.role,
        profile_id: profileId,
      },
    });
    if (updErr) {
      logger.error('auth_update_failed', { requestId, error: updErr.message });
      const body: ApiResponse<never> = {
        ok: false,
        code: 'AUTH_ERROR',
        error: `Could not update auth user: ${updErr.message}`,
      };
      return NextResponse.json(body, { status: 400 });
    }
    authUserId = existing.auth_user_id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name,
        role: input.role,
        profile_id: profileId,
      },
    });
    if (createErr || !created.user?.id) {
      logger.error('auth_create_failed', { requestId, error: createErr?.message });
      const body: ApiResponse<never> = {
        ok: false,
        code: 'AUTH_ERROR',
        error: `Could not create auth user: ${createErr?.message ?? 'unknown error'}`,
      };
      return NextResponse.json(body, { status: 400 });
    }
    authUserId = created.user.id;
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .upsert({
      id: profileId,
      auth_user_id: authUserId,
      name: input.name,
      email: normalizedEmail,
      role: input.role,
      region: input.region,
      agency_code: input.agencyCode ?? null,
      department: input.department ?? null,
      badge_number: input.badgeNumber ?? null,
      phone: input.phone ?? null,
      active: input.active,
      on_duty: input.onDuty,
    })
    .select()
    .single();

  if (profileErr || !profile) {
    logger.error('profile_upsert_failed', {
      requestId,
      authUserId,
      error: profileErr?.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: `Auth user created (${authUserId}) but profile failed: ${profileErr?.message}`,
      details: { authUserId },
    };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: 'CREATE_USER',
    target_id: normalizedEmail,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    details: `Created ${input.role} — ${input.name} (auth=${authUserId})`,
  });

  logger.info('user_created', {
    requestId,
    profileId,
    authUserId,
    role: input.role,
    actorId: caller.id,
  });

  const body: ApiResponse<{ user: User }> = {
    ok: true,
    data: { user: mapUser(profile) },
  };
  return NextResponse.json(body, { status: 201 });
}

function mapUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    authUserId: (r.auth_user_id as string | null) ?? null,
    name: r.name as string,
    email: r.email as string,
    role: r.role as User['role'],
    region: r.region as User['region'],
    agencyCode: (r.agency_code as User['agencyCode']) ?? null,
    department: (r.department as string | null) ?? null,
    badgeNumber: (r.badge_number as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    active: Boolean(r.active),
    onDuty: Boolean(r.on_duty),
    avatarUrl: (r.avatar_url as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

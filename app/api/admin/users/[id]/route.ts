import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunSystem } from '@/app/lib/rbac';
import { zUpdateUser } from '@/app/lib/schemas';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse, User } from '@/app/types';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// PATCH — update user (Super Admin only)
// -----------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunSystem(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Only Super Admins can update users.',
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

  const parsed = zUpdateUser.safeParse({ ...(json as object), id });
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

  const admin = createServiceSupabase();

  const { data: existing, error: fetchErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: 'User not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }

  // Update Auth if password provided
  if (input.password && existing.auth_user_id) {
    const { error: authErr } = await admin.auth.admin.updateUserById(existing.auth_user_id, {
      password: input.password,
      email_confirm: true,
    });
    if (authErr) {
      logger.error('auth_password_update_failed', {
        requestId,
        userId: id,
        error: authErr.message,
      });
      const body: ApiResponse<never> = {
        ok: false,
        code: 'AUTH_ERROR',
        error: `Could not update password: ${authErr.message}`,
      };
      return NextResponse.json(body, { status: 400 });
    }
  }

  // Build the profile patch — only include defined fields
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.email !== undefined) patch.email = input.email.toLowerCase();
  if (input.role !== undefined) patch.role = input.role;
  if (input.region !== undefined) patch.region = input.region;
  if (input.agencyCode !== undefined) patch.agency_code = input.agencyCode;
  if (input.department !== undefined) patch.department = input.department;
  if (input.badgeNumber !== undefined) patch.badge_number = input.badgeNumber;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.active !== undefined) patch.active = input.active;
  if (input.onDuty !== undefined) patch.on_duty = input.onDuty;
  patch.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (updateErr || !updated) {
    logger.error('profile_update_failed', {
      requestId,
      userId: id,
      error: updateErr?.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: updateErr?.message ?? 'Could not update profile.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: 'UPDATE_USER',
    target_id: id,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    details: `Updated fields: ${Object.keys(patch).filter((k) => k !== 'updated_at').join(', ')}`,
  });

  logger.info('user_updated', {
    requestId,
    userId: id,
    actorId: caller.id,
    fields: Object.keys(patch),
  });

  const body: ApiResponse<{ user: User }> = {
    ok: true,
    data: { user: mapUser(updated) },
  };
  return NextResponse.json(body);
}

// -----------------------------------------------------------------------------
// DELETE — soft deactivate (Super Admin only)
// -----------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunSystem(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Only Super Admins can deactivate users.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  // Prevent self-deactivation
  if (id === caller.id) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'You cannot deactivate your own account.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  const admin = createServiceSupabase();

  const { data: updated, error } = await admin
    .from('profiles')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: error?.message ?? 'Could not deactivate user.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: 'DEACTIVATE_USER',
    target_id: id,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    details: `Deactivated ${updated.name} (${updated.email})`,
  });

  logger.info('user_deactivated', { requestId, userId: id, actorId: caller.id });

  const body: ApiResponse<{ user: User }> = {
    ok: true,
    data: { user: mapUser(updated) },
  };
  return NextResponse.json(body);
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

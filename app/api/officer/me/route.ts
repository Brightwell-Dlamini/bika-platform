import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic, isSuperAdmin, isAdmin, isOfficer } from '@/app/lib/rbac';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse, User } from '@/app/types';

export const dynamic = 'force-dynamic';

interface OfficerMePayload {
  user: User;
  queue: {
    assignedToMe: number;
    unassignedInMyScope: number;
    slaOverdueMine: number;
    slaOverdueInMyScope: number;
    resolvedByMe7d: number;
  };
}

function mapProfile(profile: Record<string, unknown>): User {
  return {
    id: profile.id as string,
    authUserId: (profile.auth_user_id as string | null) ?? null,
    name: profile.name as string,
    email: profile.email as string,
    role: profile.role as User['role'],
    region: profile.region as User['region'],
    agencyCode: (profile.agency_code as User['agencyCode']) ?? null,
    department: (profile.department as string | null) ?? null,
    badgeNumber: (profile.badge_number as string | null) ?? null,
    phone: (profile.phone as string | null) ?? null,
    active: Boolean(profile.active),
    onDuty: Boolean(profile.on_duty),
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    createdAt: profile.created_at as string,
    updatedAt: profile.updated_at as string,
  };
}

export async function GET() {
  const caller = await getCallerProfile();
  if (!caller || isPublic(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Officer authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', caller.id)
    .single();

  if (profileError || !profile) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: 'Profile not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }

  const nationwide =
    caller.region === 'Nationwide' || isSuperAdmin(caller.role) || isAdmin(caller.role);
  const isField = isOfficer(caller.role) && !isSuperAdmin(caller.role) && !isAdmin(caller.role);

  const assignedToMe = await countIncidents(supabase, (q) =>
    q
      .eq('assigned_officer_id', caller.id)
      .not('status', 'in', '(closed,resolved,rejected)')
  );

  const unassignedInMyScope = await countIncidents(supabase, (q) => {
    let qq = q
      .is('assigned_officer_id', null)
      .not('status', 'in', '(closed,resolved,rejected)');
    if (isField) {
      if (caller.region && caller.region !== 'Nationwide') {
        qq = qq.eq('region', caller.region);
      }
      if (caller.agencyCode) {
        qq = qq.eq('assigned_agency_code', caller.agencyCode);
      }
    }
    return qq;
  });

  const slaOverdueMine = await countIncidents(supabase, (q) =>
    q
      .eq('assigned_officer_id', caller.id)
      .lt('sla_due_at', now)
      .not('status', 'in', '(closed,resolved,rejected)')
  );

  const slaOverdueInMyScope = await countIncidents(supabase, (q) => {
    let qq = q
      .lt('sla_due_at', now)
      .not('status', 'in', '(closed,resolved,rejected)');
    if (isField && !nationwide) {
      if (caller.region && caller.region !== 'Nationwide') {
        qq = qq.eq('region', caller.region);
      }
      if (caller.agencyCode) {
        qq = qq.eq('assigned_agency_code', caller.agencyCode);
      }
    }
    return qq;
  });

  const resolvedByMe7d = await countIncidents(supabase, (q) =>
    q
      .eq('assigned_officer_id', caller.id)
      .in('status', ['resolved', 'closed'])
      .gte('resolved_at', sevenDaysAgo)
  );

  const body: ApiResponse<OfficerMePayload> = {
    ok: true,
    data: {
      user: mapProfile(profile as Record<string, unknown>),
      queue: {
        assignedToMe,
        unassignedInMyScope,
        slaOverdueMine,
        slaOverdueInMyScope,
        resolvedByMe7d,
      },
    },
  };
  return NextResponse.json(body);
}

const patchSchema = z.object({
  onDuty: z.boolean(),
});

/** PATCH /api/officer/me — toggle on-duty (affects auto-assignment). */
export async function PATCH(req: NextRequest) {
  const requestId = newRequestId();
  const caller = await getCallerProfile();
  if (!caller || isPublic(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Officer authentication required.',
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
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
    return NextResponse.json(body, { status: 400 });
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ on_duty: parsed.data.onDuty, updated_at: now })
    .eq('id', caller.id)
    .select('*')
    .single();

  if (error || !profile) {
    logger.error('officer_duty_update_failed', {
      requestId,
      actorId: caller.id,
      error: error?.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not update duty status.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  logger.info('officer_duty_updated', {
    requestId,
    actorId: caller.id,
    onDuty: parsed.data.onDuty,
  });

  const body: ApiResponse<{ user: User }> = {
    ok: true,
    data: { user: mapProfile(profile as Record<string, unknown>) },
  };
  return NextResponse.json(body);
}

async function countIncidents(
  supabase: ReturnType<typeof createServiceSupabase>,
  refine: (q: any) => any
): Promise<number> {
  const base = supabase.from('incidents').select('id', { count: 'exact', head: true });
  const { count, error } = await refine(base);
  if (error) return 0;
  return count ?? 0;
}

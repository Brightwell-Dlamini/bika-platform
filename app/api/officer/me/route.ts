import { NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic, isSuperAdmin, isAdmin, isOfficer } from '@/app/lib/rbac';
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

  // Full profile
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

  const nationwide = caller.region === 'Nationwide' || isSuperAdmin(caller.role) || isAdmin(caller.role);
  const isField = isOfficer(caller.role) && !isSuperAdmin(caller.role) && !isAdmin(caller.role);

  // Queue counts
  const assignedToMe = await countIncidents(supabase, (q) =>
    q
      .eq('assigned_officer_id', caller.id)
      .not('status', 'in', '(closed,resolved,rejected)')
  );

  // Unassigned open cases in this officer's operational scope
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
    // Super Admin / Admin / Nationwide: all unassigned open cases
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
      user: {
        id: profile.id,
        authUserId: profile.auth_user_id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        region: profile.region,
        agencyCode: profile.agency_code,
        department: profile.department,
        badgeNumber: profile.badge_number,
        phone: profile.phone,
        active: profile.active,
        onDuty: profile.on_duty,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
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

async function countIncidents(
  supabase: ReturnType<typeof createServiceSupabase>,
  refine: (q: any) => any
): Promise<number> {
  const base = supabase.from('incidents').select('id', { count: 'exact', head: true });
  const { count, error } = await refine(base);
  if (error) return 0;
  return count ?? 0;
}

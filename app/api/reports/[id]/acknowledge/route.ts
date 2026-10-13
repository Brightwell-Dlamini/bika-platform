import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabase,
  getCallerProfile,
} from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { mapIncident } from '@/app/lib/mappers/incident';
import type { ApiResponse, Incident, IncidentStatus } from '@/app/types';

export const dynamic = 'force-dynamic';

/**
 * Atomic acknowledge: self-assign (if needed) + move to in_progress in one request.
 * Avoids the two-POST race where claim succeeds and transition fails.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id: rawId } = await params;
  const id = normalizeReferenceId(rawId);

  const caller = await getCallerProfile();
  if (!caller || isPublic(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Officer authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }
  if (!caller.active) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Your account is deactivated.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  const supabase = createServiceSupabase();

  const { data: incident, error: fetchError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !incident) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: 'Incident not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }

  const current = incident.status as IncidentStatus;
  const allowedFrom: IncidentStatus[] = ['submitted', 'triaged', 'assigned'];
  if (!allowedFrom.includes(current)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'INVALID_TRANSITION',
      error: `Cannot acknowledge from status "${current}".`,
    };
    return NextResponse.json(body, { status: 409 });
  }

  if (
    incident.assigned_officer_id &&
    incident.assigned_officer_id !== caller.id
  ) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'This case is assigned to another officer.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  const now = new Date().toISOString();
  const wasUnassigned = !incident.assigned_officer_id;
  const agencyCode =
    (incident.assigned_agency_code as string | null) ||
    caller.agencyCode ||
    'BIKA';

  const patch: Record<string, unknown> = {
    status: 'in_progress',
    updated_at: now,
    first_responded_at: incident.first_responded_at ?? now,
    assigned_officer_id: caller.id,
    assigned_officer_name: caller.name,
    assigned_agency_code: agencyCode,
    assigned_at: incident.assigned_at ?? now,
  };

  const { data: updated, error: updateError } = await supabase
    .from('incidents')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    logger.error('acknowledge_failed', {
      requestId,
      incidentId: id,
      error: updateError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not acknowledge case.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  if (wasUnassigned) {
    await supabase.from('assignments').insert({
      incident_id: id,
      officer_id: caller.id,
      agency_code: agencyCode,
      assigned_by: caller.id,
      reason: 'Acknowledged (atomic)',
    });
    await supabase.from('incident_events').insert({
      incident_id: id,
      type: 'incident.assigned',
      actor_id: caller.id,
      actor_name: caller.name,
      actor_role: caller.role,
      is_public: true,
      payload: {
        officerId: caller.id,
        officerName: caller.name,
        agencyCode,
        reason: 'Acknowledged',
      },
    });
  }

  await supabase.from('incident_events').insert({
    incident_id: id,
    type: 'incident.status_changed',
    actor_id: caller.id,
    actor_name: caller.name,
    actor_role: caller.role,
    is_public: true,
    payload: {
      from: current,
      to: 'in_progress',
      note: 'Acknowledged — working the case',
    },
  });

  logger.info('acknowledge_applied', {
    requestId,
    incidentId: id,
    from: current,
    actorId: caller.id,
    claimed: wasUnassigned,
  });

  const body: ApiResponse<{ incident: Incident }> = {
    ok: true,
    data: { incident: mapIncident(updated as Record<string, unknown>) },
  };
  return NextResponse.json(body);
}

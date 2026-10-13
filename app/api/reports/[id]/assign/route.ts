import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createServiceSupabase,
  getCallerProfile,
} from '@/app/lib/supabase/server';
import { isPublic, canRunWork } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { dispatch } from '@/app/lib/notifications/dispatcher';
import { officerAssignment } from '@/app/lib/notifications/templates';
import type { ApiResponse, Incident } from '@/app/types';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  officerId: z.string().min(1),
  agencyCode: z.enum(['REPS', 'MOH', 'NRTC', 'NFES', 'MPWT', 'ACC', 'BIKA']),
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const { officerId, agencyCode, reason } = parsed.data;

  const supabase = createServiceSupabase();

  // Only Admins/Super Admins can reassign to another officer.
  // Officers can claim a case only for themselves.
  const isSelfClaim = officerId === caller.id;
  if (!isSelfClaim && !canRunWork(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Only admins can reassign cases to other officers.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  // Verify target officer
  const { data: officer, error: officerError } = await supabase
    .from('profiles')
    .select('id, name, agency_code, active, on_duty')
    .eq('id', officerId)
    .maybeSingle();

  if (officerError || !officer) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: 'Target officer not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }
  if (!officer.active) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Target officer account is deactivated.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  // Verify incident exists
  const { data: incident, error: fetchError } = await supabase
    .from('incidents')
    .select('id, status, assigned_officer_id')
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

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    assigned_officer_id: officer.id,
    assigned_officer_name: officer.name,
    assigned_agency_code: agencyCode,
    assigned_at: now,
    updated_at: now,
  };

  // Auto-advance status if still in early phase
  if (incident.status === 'submitted' || incident.status === 'triaged') {
    patch.status = 'assigned';
  }

  // Close out previous assignment record
  if (incident.assigned_officer_id) {
    await supabase
      .from('assignments')
      .update({ unassigned_at: now })
      .eq('incident_id', id)
      .is('unassigned_at', null);
  }

  const { data: updated, error: updateError } = await supabase
    .from('incidents')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    logger.error('assign_update_failed', {
      requestId,
      incidentId: id,
      error: updateError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not assign case.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  // Track assignment history
  await supabase.from('assignments').insert({
    incident_id: id,
    officer_id: officer.id,
    agency_code: agencyCode,
    assigned_by: caller.id,
    reason: reason ?? null,
  });

  // Log event
  await supabase.from('incident_events').insert({
    incident_id: id,
    type: 'incident.assigned',
    actor_id: caller.id,
    actor_name: caller.name,
    actor_role: caller.role,
    is_public: true,
    payload: {
      officerId: officer.id,
      officerName: officer.name,
      agencyCode,
      reason: reason ?? null,
    },
  });

  logger.info('assign_applied', {
    requestId,
    incidentId: id,
    officerId: officer.id,
    agencyCode,
    actorId: caller.id,
  });

  // Notify the assigned officer — fire-and-forget.
  void notifyAssignedOfficer(id, officer.id, officer.name, updated).catch((err) => {
    logger.warn('assign_notify_failed', {
      requestId,
      incidentId: id,
      error: String(err),
    });
  });

  const body: ApiResponse<{ incident: Incident }> = {
    ok: true,
    data: { incident: mapIncident(updated) },
  };
  return NextResponse.json(body);
}

// -----------------------------------------------------------------------------
// Officer notification
// -----------------------------------------------------------------------------

async function notifyAssignedOfficer(
  incidentId: string,
  officerId: string,
  officerName: string,
  row: Record<string, unknown>
): Promise<void> {
  const incident = mapIncident(row);
  const msg = officerAssignment(incident, officerName);

  await dispatch({
    channels: ['webhook', 'email'],
    incidentId,
    eventType: 'officer.assigned',
    payload: {
      subject: msg.subject,
      body: msg.body,
      data: { incidentId, officerId, officerName },
    },
  });
}

// -----------------------------------------------------------------------------
// Row mapper
// -----------------------------------------------------------------------------

function mapIncident(row: Record<string, unknown>): Incident {
  return {
    id: row.id as string,
    reportType: row.report_type as Incident['reportType'],
    category: row.category as string,
    mode: row.mode as Incident['mode'],
    region: row.region as Incident['region'],
    location: row.location as string,
    description: row.description as string,
    severity: row.severity as Incident['severity'],
    status: row.status as Incident['status'],
    reporterName: (row.reporter_name as string | null) ?? null,
    reporterPhone: (row.reporter_phone as string | null) ?? null,
    reporterEmail: (row.reporter_email as string | null) ?? null,
    isAnonymous: Boolean(row.is_anonymous),
    vehicleRegistration: (row.vehicle_registration as string | null) ?? null,
    fleetId: (row.fleet_id as string | null) ?? null,
    establishmentId: (row.establishment_id as string | null) ?? null,
    operatorName: (row.operator_name as string | null) ?? null,
    driverName: (row.driver_name as string | null) ?? null,
    establishmentName: (row.establishment_name as string | null) ?? null,
    assignedOfficerId: (row.assigned_officer_id as string | null) ?? null,
    assignedOfficerName: (row.assigned_officer_name as string | null) ?? null,
    assignedAgencyCode: (row.assigned_agency_code as Incident['assignedAgencyCode']) ?? null,
    assignedAt: (row.assigned_at as string | null) ?? null,
    coordinates: (row.coordinates as Incident['coordinates']) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    triagedAt: (row.triaged_at as string | null) ?? null,
    firstRespondedAt: (row.first_responded_at as string | null) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    closedAt: (row.closed_at as string | null) ?? null,
    slaDueAt: (row.sla_due_at as string | null) ?? null,
    isRepeatedAlert: Boolean(row.is_repeated_alert),
    escalatedCount: Number(row.escalated_count ?? 0),
    duplicateOfId: (row.duplicate_of_id as string | null) ?? null,
    attachments: (row.attachments as Incident['attachments']) ?? [],
    citizenRating: row.citizen_rating_score
      ? {
          score: Number(row.citizen_rating_score),
          comment: (row.citizen_rating_comment as string | null) ?? null,
          ratedAt: row.citizen_rated_at as string,
        }
      : null,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createServiceSupabase,
  getCallerProfile,
} from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { dispatch } from '@/app/lib/notifications/dispatcher';
import {
  citizenStatusChange,
  citizenResolved,
} from '@/app/lib/notifications/templates';
import type { ApiResponse, Incident, IncidentStatus } from '@/app/types';

export const dynamic = 'force-dynamic';

const ALLOWED: Record<IncidentStatus, IncidentStatus[]> = {
  submitted: ['triaged', 'assigned', 'in_progress', 'rejected', 'escalated'],
  triaged: ['assigned', 'in_progress', 'awaiting_info', 'rejected', 'escalated'],
  assigned: ['in_progress', 'awaiting_info', 'resolved', 'escalated', 'triaged'],
  in_progress: ['resolved', 'awaiting_info', 'escalated', 'closed'],
  awaiting_info: ['in_progress', 'resolved', 'rejected'],
  escalated: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
  rejected: [],
};

const bodySchema = z.object({
  to: z.enum([
    'submitted',
    'triaged',
    'assigned',
    'in_progress',
    'awaiting_info',
    'escalated',
    'resolved',
    'closed',
    'rejected',
  ]),
  note: z.string().max(2000).optional(),
});

// Statuses that warrant a citizen-facing notification
const CITIZEN_NOTIFY_STATUSES: IncidentStatus[] = [
  'triaged',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'escalated',
];

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
  if (!caller.active) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Your account is deactivated.',
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'VALIDATION_FAILED',
      error: parsed.error.issues.map((i) => i.message).join('; '),
      details: parsed.error.flatten(),
    };
    return NextResponse.json(body, { status: 400 });
  }
  const { to, note } = parsed.data;

  const supabase = createServiceSupabase();

  const { data: incident, error: fetchError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    logger.error('transition_fetch_failed', {
      requestId,
      incidentId: id,
      error: fetchError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not load incident.',
    };
    return NextResponse.json(body, { status: 500 });
  }
  if (!incident) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: 'Incident not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }

  const current = incident.status as IncidentStatus;

  if (!ALLOWED[current]?.includes(to)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'INVALID_TRANSITION',
      error: `Cannot transition from "${current}" to "${to}".`,
      details: { current, allowed: ALLOWED[current] },
    };
    return NextResponse.json(body, { status: 409 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: to,
    updated_at: now,
  };

  if (to === 'triaged' && !incident.triaged_at) patch.triaged_at = now;
  if (to === 'in_progress' && !incident.first_responded_at) patch.first_responded_at = now;
  if (to === 'resolved' && !incident.resolved_at) patch.resolved_at = now;
  if (to === 'closed' && !incident.closed_at) patch.closed_at = now;
  if (to === 'escalated') {
    patch.escalated_count = (Number(incident.escalated_count) || 0) + 1;
  }

  const eventType =
    to === 'triaged'
      ? 'incident.triaged'
      : to === 'resolved'
        ? 'incident.resolved'
        : to === 'closed'
          ? 'incident.closed'
          : to === 'escalated'
            ? 'incident.escalated'
            : 'incident.status_changed';

  const { data: updated, error: updateError } = await supabase
    .from('incidents')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    logger.error('transition_update_failed', {
      requestId,
      incidentId: id,
      from: current,
      to,
      error: updateError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not update incident status.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const { error: eventError } = await supabase.from('incident_events').insert({
    incident_id: id,
    type: eventType,
    actor_id: caller.id,
    actor_name: caller.name,
    actor_role: caller.role,
    is_public: true,
    payload: {
      from: current,
      to,
      note: note ?? null,
    },
  });

  if (eventError) {
    logger.error('transition_event_insert_failed', {
      requestId,
      incidentId: id,
      error: eventError.message,
    });
  }

  logger.info('transition_applied', {
    requestId,
    incidentId: id,
    from: current,
    to,
    actorId: caller.id,
    actorRole: caller.role,
  });

  // Notify citizen — awaited so notification_log is written before response.
  if (CITIZEN_NOTIFY_STATUSES.includes(to)) {
    try {
      await notifyCitizenStatusChange(id, to, updated);
    } catch (err) {
      logger.warn('transition_notify_failed', {
        requestId,
        incidentId: id,
        error: String(err),
      });
    }
  }

  const body: ApiResponse<{ incident: Incident }> = {
    ok: true,
    data: { incident: mapIncident(updated) },
  };
  return NextResponse.json(body);
}

async function notifyCitizenStatusChange(
  incidentId: string,
  newStatus: IncidentStatus,
  row: Record<string, unknown>
): Promise<void> {
  if (row.is_anonymous) return;
  const phone = row.reporter_phone as string | null;
  const email = row.reporter_email as string | null;
  if (!phone && !email) return;

  const incident = mapIncident(row);
  const msg =
    newStatus === 'resolved'
      ? citizenResolved(incident)
      : citizenStatusChange(incident, newStatus);

  await dispatch({
    channels: ['email', 'sms'],
    incidentId,
    eventType: `citizen.status.${newStatus}`,
    payload: {
      subject: msg.subject,
      body: msg.body,
      toPhone: phone ?? undefined,
      toEmail: email ?? undefined,
      data: { incidentId, newStatus },
    },
  });
}

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

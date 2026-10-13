import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse, Incident, IncidentEvent } from '@/app/types';

export const dynamic = 'force-dynamic';

interface DetailPayload {
  incident: Incident;
  events: IncidentEvent[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id: rawId } = await params;
  const id = normalizeReferenceId(rawId);

  if (!id) {
    const body: ApiResponse<never> = { ok: false, code: 'BAD_REQUEST', error: 'Missing reference id.' };
    return NextResponse.json(body, { status: 400 });
  }

  const caller = await getCallerProfile();
  const isPublicCaller = !caller || isPublic(caller.role);

  const supabase = createServiceSupabase();

  const { data: incident, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('incident_fetch_failed', { requestId, incidentId: id, error: error.message });
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: 'Could not load incident.' };
    return NextResponse.json(body, { status: 500 });
  }
  if (!incident) {
    const body: ApiResponse<never> = { ok: false, code: 'NOT_FOUND', error: 'Report not found.' };
    return NextResponse.json(body, { status: 404 });
  }

  // Fetch events — public caller sees only is_public = true
  let eventsQuery = supabase
    .from('incident_events')
    .select('*')
    .eq('incident_id', id)
    .order('created_at', { ascending: true });

  if (isPublicCaller) eventsQuery = eventsQuery.eq('is_public', true);

  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) {
    logger.warn('incident_events_fetch_failed', {
      requestId,
      incidentId: id,
      error: eventsError.message,
    });
  }

  const mapped = mapIncident(incident);

  // Sanitize for public callers — strip PII.
  const sanitized = isPublicCaller ? stripPII(mapped) : mapped;

  const body: ApiResponse<DetailPayload> = {
    ok: true,
    data: {
      incident: sanitized,
      events: (events ?? []).map(mapEvent),
    },
  };
  return NextResponse.json(body);
}

function stripPII(incident: Incident): Incident {
  return {
    ...incident,
    reporterName: null,
    reporterPhone: null,
    reporterEmail: null,
  };
}

function mapIncident(row: Record<string, unknown>): Incident {
  // Same mapper as /api/reports — will extract to shared util in a later refactor.
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

function mapEvent(row: Record<string, unknown>): IncidentEvent {
  return {
    id: row.id as string,
    incidentId: row.incident_id as string,
    type: row.type as IncidentEvent['type'],
    actorId: (row.actor_id as string | null) ?? null,
    actorName: row.actor_name as string,
    actorRole: row.actor_role as IncidentEvent['actorRole'],
    isPublic: Boolean(row.is_public),
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

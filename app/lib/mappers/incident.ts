/**
 * Shared row → domain mappers for incidents and events.
 * Single source of truth for API routes (POST list, GET detail, etc.).
 */

import type { Incident, IncidentEvent } from '@/app/types';

export function mapIncident(row: Record<string, unknown>): Incident {
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

export function mapEvent(row: Record<string, unknown>): IncidentEvent {
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

/** Strip reporter PII for public (unauthenticated) callers. */
export function stripIncidentPII(incident: Incident): Incident {
  return {
    ...incident,
    reporterName: null,
    reporterPhone: null,
    reporterEmail: null,
  };
}

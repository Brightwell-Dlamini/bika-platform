import 'server-only';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { logger } from '@/app/lib/logger';
import { dispatch, defaultChannelsForSeverity } from '@/app/lib/notifications/dispatcher';
import {
  officerAssignment,
  officerCritical,
} from '@/app/lib/notifications/templates';
import { computeSlaDueAt } from './sla';
import type { Incident, AgencyCode } from '@/app/types';

/**
 * BIKA v2 — Incident automation.
 *
 * Runs after every create or state change. Idempotent — safe to retry.
 *
 *   1. SLA   — compute sla_due_at if missing (DB trigger may already set it)
 *   2. Route — determine the correct agency from mode + category
 *   3. Assign — pick an on-duty officer in that agency if unassigned and severity warrants
 *   4. Notify — dispatch to configured channels
 *
 * Never throws to the caller when invoked via the reports route try/catch,
 * but logs structured failures for every step.
 */

interface AutomationResult {
  slaDueAt: string | null;
  agencyCode: AgencyCode | null;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  notificationsSent: string[];
}

export async function runIncidentAutomation(
  incidentId: string,
  options: { isCreate?: boolean } = {}
): Promise<AutomationResult> {
  const isCreate = options.isCreate ?? false;
  const result: AutomationResult = {
    slaDueAt: null,
    agencyCode: null,
    assignedOfficerId: null,
    assignedOfficerName: null,
    notificationsSent: [],
  };

  try {
    const supabase = createServiceSupabase();

    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .maybeSingle();

    if (error || !incident) {
      logger.warn('automation_incident_not_found', {
        incidentId,
        error: error?.message,
      });
      return result;
    }

    const patch: Record<string, unknown> = {};

    // -----------------------------------------------------------------------
    // 1. SLA (trigger may already have set this on INSERT)
    // -----------------------------------------------------------------------

    if (!incident.sla_due_at) {
      const due = computeSlaDueAt(incident.severity as never, new Date(incident.created_at));
      patch.sla_due_at = due.toISOString();
      result.slaDueAt = due.toISOString();
    } else {
      result.slaDueAt = incident.sla_due_at;
    }

    // -----------------------------------------------------------------------
    // 2. Route — determine agency from mode + category
    // -----------------------------------------------------------------------

    const targetAgency = determineAgency(
      incident.mode as string,
      incident.category as string,
      incident.report_type as string
    );
    result.agencyCode = targetAgency;

    // Always stamp agency when known and not already set (triage visibility).
    if (targetAgency && !incident.assigned_agency_code) {
      patch.assigned_agency_code = targetAgency;
    }

    // -----------------------------------------------------------------------
    // 3. Assign — pick an on-duty officer if the case warrants it
    // -----------------------------------------------------------------------

    const severity = String(incident.severity ?? '').toUpperCase();
    const shouldAssign =
      !incident.assigned_officer_id &&
      Boolean(targetAgency) &&
      (severity === 'CRITICAL' || severity === 'HIGH');

    if (shouldAssign && targetAgency) {
      const officer = await pickOfficer(supabase, targetAgency, String(incident.region ?? ''));
      if (officer) {
        patch.assigned_officer_id = officer.id;
        patch.assigned_officer_name = officer.name;
        patch.assigned_agency_code = targetAgency;
        patch.assigned_at = new Date().toISOString();

        if (incident.status === 'submitted' || incident.status === 'triaged') {
          patch.status = 'assigned';
        }

        result.assignedOfficerId = officer.id;
        result.assignedOfficerName = officer.name;

        const { error: eventErr } = await supabase.from('incident_events').insert({
          incident_id: incidentId,
          type: 'incident.assigned',
          actor_id: null,
          actor_name: 'BIKA Auto-Router',
          actor_role: 'super_admin',
          is_public: true,
          payload: {
            officerId: officer.id,
            officerName: officer.name,
            agencyCode: targetAgency,
            automated: true,
          },
        });
        if (eventErr) {
          logger.warn('automation_assign_event_failed', {
            incidentId,
            error: eventErr.message,
          });
        }

        const { error: assignHistErr } = await supabase.from('assignments').insert({
          incident_id: incidentId,
          officer_id: officer.id,
          agency_code: targetAgency,
          assigned_by: null,
          reason: 'Auto-assigned by BIKA automation',
        });
        if (assignHistErr) {
          logger.warn('automation_assignments_row_failed', {
            incidentId,
            error: assignHistErr.message,
          });
        }
      } else {
        logger.warn('automation_no_officer', {
          incidentId,
          agency: targetAgency,
          region: incident.region,
          severity,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Apply the patch (if any)
    // -----------------------------------------------------------------------

    if (Object.keys(patch).length > 0) {
      const { error: updateErr } = await supabase
        .from('incidents')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', incidentId);

      if (updateErr) {
        logger.error('automation_update_failed', {
          incidentId,
          error: updateErr.message,
          patchKeys: Object.keys(patch),
        });
      }
    }

    // -----------------------------------------------------------------------
    // 4. Notify
    // -----------------------------------------------------------------------

    const { data: enriched } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .maybeSingle();

    if (enriched) {
      const mapped = mapIncident(enriched);

      if (result.assignedOfficerId && result.assignedOfficerName) {
        const msg = officerAssignment(mapped, result.assignedOfficerName);
        const channels = defaultChannelsForSeverity(mapped.severity);
        const dispatched = await dispatch({
          channels,
          incidentId,
          eventType: 'officer.assigned',
          payload: {
            subject: msg.subject,
            body: msg.body,
            data: { incidentId, officerId: result.assignedOfficerId },
          },
        });
        result.notificationsSent.push(
          ...dispatched.results.filter((r) => r.status === 'sent').map((r) => r.channel)
        );
      }

      if (isCreate && mapped.severity === 'CRITICAL') {
        const msg = officerCritical(mapped);
        const dispatched = await dispatch({
          channels: ['webhook', 'email', 'sms'],
          incidentId,
          eventType: 'incident.critical',
          payload: {
            subject: msg.subject,
            body: msg.body,
            data: { incidentId, severity: mapped.severity },
          },
        });
        result.notificationsSent.push(
          ...dispatched.results.filter((r) => r.status === 'sent').map((r) => r.channel)
        );
      }
    }

    if (!isCreate) {
      await supabase.from('incident_events').insert({
        incident_id: incidentId,
        type: 'incident.status_changed',
        actor_id: null,
        actor_name: 'BIKA Automation',
        actor_role: 'super_admin',
        is_public: false,
        payload: { patch, source: 'automation' },
      });
    }

    logger.info('automation_complete', {
      incidentId,
      isCreate,
      slaDueAt: result.slaDueAt,
      agencyCode: result.agencyCode,
      assigned: Boolean(result.assignedOfficerId),
      notifications: result.notificationsSent,
    });

    return result;
  } catch (err) {
    logger.error('automation_threw', {
      incidentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return result;
  }
}

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------

function determineAgency(
  mode: string,
  category: string,
  reportType: string
): AgencyCode | null {
  const cat = `${mode} ${category}`.toLowerCase();

  if (reportType === 'emergency') return 'REPS';

  if (
    cat.includes('food') ||
    cat.includes('hygiene') ||
    cat.includes('restaurant') ||
    cat.includes('produce') ||
    cat.includes('expired')
  ) {
    return 'MOH';
  }
  if (cat.includes('rank') || cat.includes('marshal') || cat.includes('permit') || cat.includes('route')) {
    return 'NRTC';
  }
  if (cat.includes('fire') || cat.includes('hazmat')) {
    return 'NFES';
  }
  if (cat.includes('corruption') || cat.includes('bribery')) {
    return 'ACC';
  }
  if (
    cat.includes('transport') ||
    cat.includes('driving') ||
    cat.includes('overload') ||
    cat.includes('vehicle') ||
    cat.includes('fare') ||
    cat.includes('kombi')
  ) {
    return 'REPS';
  }

  return 'BIKA';
}

// -----------------------------------------------------------------------------
// Officer selection
// -----------------------------------------------------------------------------

interface PickedOfficer {
  id: string;
  name: string;
}

async function pickOfficer(
  supabase: ReturnType<typeof createServiceSupabase>,
  agency: AgencyCode,
  region: string
): Promise<PickedOfficer | null> {
  // Prefer on-duty, same region
  const sameRegion = await supabase
    .from('profiles')
    .select('id, name')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .eq('region', region)
    .limit(1);

  if (sameRegion.error) {
    logger.warn('pick_officer_query_failed', {
      step: 'same_region',
      agency,
      region,
      error: sameRegion.error.message,
    });
  } else if (sameRegion.data && sameRegion.data.length > 0) {
    return { id: sameRegion.data[0].id, name: sameRegion.data[0].name };
  }

  // Fallback: on-duty nationwide
  const nationwide = await supabase
    .from('profiles')
    .select('id, name')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .eq('region', 'Nationwide')
    .limit(1);

  if (nationwide.error) {
    logger.warn('pick_officer_query_failed', {
      step: 'nationwide',
      agency,
      error: nationwide.error.message,
    });
  } else if (nationwide.data && nationwide.data.length > 0) {
    return { id: nationwide.data[0].id, name: nationwide.data[0].name };
  }

  // Last resort: any active officer in the agency
  const anyActive = await supabase
    .from('profiles')
    .select('id, name')
    .eq('agency_code', agency)
    .eq('active', true)
    .limit(1);

  if (anyActive.error) {
    logger.warn('pick_officer_query_failed', {
      step: 'any_active',
      agency,
      error: anyActive.error.message,
    });
  } else if (anyActive.data && anyActive.data.length > 0) {
    return { id: anyActive.data[0].id, name: anyActive.data[0].name };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Row mapper (mirrors reports route)
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

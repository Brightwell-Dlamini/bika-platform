import 'server-only';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { logger } from '@/app/lib/logger';
import { dispatch, defaultStaffChannels } from '@/app/lib/notifications/dispatcher';
import {
  officerAssignment,
  officerCritical,
  officerNewInQueue,
} from '@/app/lib/notifications/templates';
import {
  excludeIds,
  loadOnDutyOfficerIds,
  loadSupervisorIds,
  uniqueIds,
} from '@/app/lib/notifications/recipients';
import { mapIncident } from '@/app/lib/mappers/incident';
import { computeSlaDueAt } from './sla';
import type { AgencyCode } from '@/app/types';

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

    if (!incident.sla_due_at) {
      const due = computeSlaDueAt(incident.severity as never, new Date(incident.created_at));
      patch.sla_due_at = due.toISOString();
      result.slaDueAt = due.toISOString();
    } else {
      result.slaDueAt = incident.sla_due_at;
    }

    const targetAgency = determineAgency(
      incident.mode as string,
      incident.category as string,
      incident.report_type as string
    );
    result.agencyCode = targetAgency;

    if (targetAgency && !incident.assigned_agency_code) {
      patch.assigned_agency_code = targetAgency;
    }

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
            openCasesAtPick: officer.openCases,
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
          reason: 'Auto-assigned by BIKA automation (load-aware)',
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

    const { data: enriched } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .maybeSingle();

    if (enriched && isCreate) {
      const mapped = mapIncident(enriched as Record<string, unknown>);
      const channels = defaultStaffChannels();
      const agency = (result.agencyCode ?? targetAgency) as AgencyCode | null;
      const region = String(incident.region ?? '');

      // 0) Supervisors / admins — every new incident (oversight)
      const supervisors = await loadSupervisorIds(supabase);
      if (supervisors.length > 0) {
        const adminMsg =
          mapped.severity === 'CRITICAL'
            ? officerCritical(mapped)
            : officerNewInQueue(mapped);
        const dispatched = await dispatch({
          channels,
          incidentId,
          eventType: 'incident.created.admin',
          recipientUserIds: supervisors,
          href: `/officer/case/${incidentId}`,
          payload: {
            subject: adminMsg.subject,
            body: adminMsg.body,
            data: { incidentId, severity: mapped.severity, audience: 'supervisor' },
          },
        });
        result.notificationsSent.push(
          ...dispatched.results.filter((r) => r.status === 'sent').map((r) => r.channel)
        );
      }

      // 1) Assignment → assignee only
      if (result.assignedOfficerId && result.assignedOfficerName) {
        const msg = officerAssignment(mapped, result.assignedOfficerName);
        const dispatched = await dispatch({
          channels,
          incidentId,
          eventType: 'officer.assigned',
          recipientUserIds: [result.assignedOfficerId],
          href: `/officer/case/${incidentId}`,
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

      const onDuty = await loadOnDutyOfficerIds(supabase, agency, region);

      // 2) CRITICAL → on-duty peers (exclude assignee + supervisors already notified)
      if (mapped.severity === 'CRITICAL') {
        const criticalRecipients = excludeIds(
          onDuty,
          result.assignedOfficerId,
          ...supervisors
        );
        if (criticalRecipients.length > 0) {
          const msg = officerCritical(mapped);
          const dispatched = await dispatch({
            channels,
            incidentId,
            eventType: 'incident.critical',
            recipientUserIds: criticalRecipients,
            href: `/officer/case/${incidentId}`,
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
      } else if (!result.assignedOfficerId && onDuty.length > 0) {
        // 3) Unassigned non-critical → queue ping for on-duty (not supervisors twice)
        const queueRecipients = excludeIds(uniqueIds(onDuty), ...supervisors);
        if (queueRecipients.length > 0) {
          const msg = officerNewInQueue(mapped);
          const dispatched = await dispatch({
            channels,
            incidentId,
            eventType: 'incident.queued',
            recipientUserIds: queueRecipients,
            href: `/officer/case/${incidentId}`,
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

interface PickedOfficer {
  id: string;
  name: string;
  openCases: number;
}

async function pickOfficer(
  supabase: ReturnType<typeof createServiceSupabase>,
  agency: AgencyCode,
  region: string
): Promise<PickedOfficer | null> {
  const candidates = await loadCandidates(supabase, agency, region);
  if (candidates.length === 0) return null;

  const ids = candidates.map((c) => c.id);
  const { data: openRows } = await supabase
    .from('incidents')
    .select('assigned_officer_id')
    .in('assigned_officer_id', ids)
    .not('status', 'in', '(closed,resolved,rejected)');

  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, 0);
  for (const row of openRows ?? []) {
    const oid = row.assigned_officer_id as string;
    counts.set(oid, (counts.get(oid) ?? 0) + 1);
  }

  let best = candidates[0]!;
  let bestLoad = counts.get(best.id) ?? 0;
  for (const c of candidates.slice(1)) {
    const load = counts.get(c.id) ?? 0;
    if (load < bestLoad) {
      best = c;
      bestLoad = load;
    }
  }

  return { id: best.id, name: best.name, openCases: bestLoad };
}

async function loadCandidates(
  supabase: ReturnType<typeof createServiceSupabase>,
  agency: AgencyCode,
  region: string
): Promise<Array<{ id: string; name: string }>> {
  const sameRegion = await supabase
    .from('profiles')
    .select('id, name')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .eq('region', region)
    .limit(25);

  if (!sameRegion.error && sameRegion.data && sameRegion.data.length > 0) {
    return sameRegion.data;
  }

  const nationwide = await supabase
    .from('profiles')
    .select('id, name')
    .eq('agency_code', agency)
    .eq('active', true)
    .eq('on_duty', true)
    .eq('region', 'Nationwide')
    .limit(25);

  if (!nationwide.error && nationwide.data && nationwide.data.length > 0) {
    return nationwide.data;
  }

  const anyActive = await supabase
    .from('profiles')
    .select('id, name')
    .eq('agency_code', agency)
    .eq('active', true)
    .limit(25);

  if (!anyActive.error && anyActive.data && anyActive.data.length > 0) {
    return anyActive.data;
  }

  return [];
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { dispatch } from '@/app/lib/notifications/dispatcher';
import { slaBreachAlert } from '@/app/lib/notifications/templates';
import { logger } from '@/app/lib/logger';
import { env } from '@/app/lib/env';
import type { ApiResponse, Incident } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/sla-check
 *
 * Scans open incidents whose SLA deadline has passed. For each one:
 *   1. If not already escalated, bump escalated_count + insert event
 *   2. Notify configured channels (once per incident per hour)
 *
 * Protect with a bearer token matching CRON_SECRET (or USSD_WEBHOOK_SECRET
 * as a fallback). Vercel Cron sends `Authorization: Bearer <secret>`.
 */

export async function GET(req: NextRequest) {
  // Guard: only cron callers with the secret may run this
  const secret = env.USSD_WEBHOOK_SECRET; // reuse
  if (env.NODE_ENV === 'production') {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const queryToken = req.nextUrl.searchParams.get('token') ?? '';
    if (!secret || (token !== secret && queryToken !== secret)) {
      const body: ApiResponse<never> = {
        ok: false,
        code: 'FORBIDDEN',
        error: 'Cron authentication required.',
      };
      return NextResponse.json(body, { status: 403 });
    }
  }

  const supabase = createServiceSupabase();
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .lt('sla_due_at', now)
    .not('status', 'in', '(resolved,closed,rejected)')
    .order('sla_due_at', { ascending: true })
    .limit(100);

  if (error) {
    logger.error('sla_check_query_failed', { error: error.message });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: error.message,
    };
    return NextResponse.json(body, { status: 500 });
  }

  const overdue = data ?? [];
  let escalated = 0;
  let notified = 0;

  for (const row of overdue) {
    const incident = mapIncident(row);
    const overdueMins = (Date.now() - new Date(incident.slaDueAt!).getTime()) / 60_000;

    // 1. Escalate if not already escalated recently
    const alreadyEscalated = incident.escalatedCount > 0;
    if (!alreadyEscalated || incident.status !== 'escalated') {
      const { error: escErr } = await supabase
        .from('incidents')
        .update({
          status: incident.status === 'submitted' || incident.status === 'triaged'
            ? 'escalated'
            : incident.status,
          escalated_count: incident.escalatedCount + 1,
          updated_at: now,
        })
        .eq('id', incident.id);

      if (!escErr) {
        escalated++;
        await supabase.from('incident_events').insert({
          incident_id: incident.id,
          type: 'incident.escalated',
          actor_id: null,
          actor_name: 'BIKA SLA Monitor',
          actor_role: 'super_admin',
          is_public: false,
          payload: {
            reason: `SLA breached by ${Math.round(overdueMins)} minutes`,
            automated: true,
          },
        });
      }
    }

    // 2. Notify — but throttle to once per hour
    const { data: recentLog } = await supabase
      .from('notification_log')
      .select('id')
      .eq('incident_id', incident.id)
      .eq('event', 'sla.breach')
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (!recentLog || recentLog.length === 0) {
      const msg = slaBreachAlert(incident, overdueMins);
      const result = await dispatch({
        channels: ['webhook', 'email'],
        incidentId: incident.id,
        eventType: 'sla.breach',
        payload: {
          subject: msg.subject,
          body: msg.body,
          data: { incidentId: incident.id, overdueMins },
        },
      });
      if (result.delivered) notified++;
    }
  }

  logger.info('sla_check_complete', {
    scanned: overdue.length,
    escalated,
    notified,
  });

  const body: ApiResponse<{
    scanned: number;
    escalated: number;
    notified: number;
  }> = {
    ok: true,
    data: { scanned: overdue.length, escalated, notified },
  };
  return NextResponse.json(body);
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

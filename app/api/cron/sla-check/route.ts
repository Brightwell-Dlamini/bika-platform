import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { defaultStaffChannels, dispatch } from '@/app/lib/notifications/dispatcher';
import { slaBreachAlert } from '@/app/lib/notifications/templates';
import { loadSupervisorIds, uniqueIds } from '@/app/lib/notifications/recipients';
import { logger } from '@/app/lib/logger';
import { env } from '@/app/lib/env';
import { mapIncident } from '@/app/lib/mappers/incident';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/sla-check
 * Auth: Authorization Bearer CRON_SECRET (or USSD_WEBHOOK_SECRET fallback).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || env.USSD_WEBHOOK_SECRET;
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
  const supervisors = await loadSupervisorIds(supabase);

  for (const row of overdue) {
    const incident = mapIncident(row as Record<string, unknown>);
    const overdueMins = (Date.now() - new Date(incident.slaDueAt!).getTime()) / 60_000;

    const alreadyEscalated = incident.escalatedCount > 0;
    if (!alreadyEscalated || incident.status !== 'escalated') {
      const { error: escErr } = await supabase
        .from('incidents')
        .update({
          status:
            incident.status === 'submitted' || incident.status === 'triaged'
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

    const { data: recentLog } = await supabase
      .from('notification_log')
      .select('id')
      .eq('incident_id', incident.id)
      .eq('event', 'sla.breach')
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (!recentLog || recentLog.length === 0) {
      const recipients = uniqueIds(incident.assignedOfficerId, supervisors);
      if (recipients.length === 0) continue;

      const msg = slaBreachAlert(incident, overdueMins);
      const result = await dispatch({
        channels: defaultStaffChannels(),
        incidentId: incident.id,
        eventType: 'sla.breach',
        recipientUserIds: recipients,
        href: `/officer/case/${incident.id}`,
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

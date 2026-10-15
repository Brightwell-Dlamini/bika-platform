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
import { mapIncident } from '@/app/lib/mappers/incident';
import {
  ALLOWED_TRANSITIONS,
  CITIZEN_NOTIFY_STATUSES,
  canTransition,
} from '@/app/lib/statusTransitions';
import type { ApiResponse, Incident, IncidentStatus } from '@/app/types';

export const dynamic = 'force-dynamic';

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

  if (!canTransition(current, to)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'INVALID_TRANSITION',
      error: `Cannot transition from "${current}" to "${to}".`,
      details: { current, allowed: ALLOWED_TRANSITIONS[current] },
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

  if (CITIZEN_NOTIFY_STATUSES.includes(to)) {
    try {
      await notifyCitizenStatusChange(id, to, updated as Record<string, unknown>);
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
    data: { incident: mapIncident(updated as Record<string, unknown>) },
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

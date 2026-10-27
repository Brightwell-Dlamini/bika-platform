import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createServiceSupabase,
  getCallerProfile,
} from '@/app/lib/supabase/server';
import { isPublic, canRunWork } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { defaultStaffChannels, dispatch } from '@/app/lib/notifications/dispatcher';
import { officerAssignment, officerUnassigned } from '@/app/lib/notifications/templates';
import { mapIncident } from '@/app/lib/mappers/incident';
import type { ApiResponse, Incident } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  const isSelfClaim = officerId === caller.id;
  if (!isSelfClaim && !canRunWork(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Only admins can reassign cases to other officers.',
    };
    return NextResponse.json(body, { status: 403 });
  }

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

  const previousOfficerId = (incident.assigned_officer_id as string | null) ?? null;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    assigned_officer_id: officer.id,
    assigned_officer_name: officer.name,
    assigned_agency_code: agencyCode,
    assigned_at: now,
    updated_at: now,
  };

  if (incident.status === 'submitted' || incident.status === 'triaged') {
    patch.status = 'assigned';
  }

  if (previousOfficerId) {
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

  await supabase.from('assignments').insert({
    incident_id: id,
    officer_id: officer.id,
    agency_code: agencyCode,
    assigned_by: caller.id,
    reason: reason ?? null,
  });

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
      previousOfficerId,
    },
  });

  logger.info('assign_applied', {
    requestId,
    incidentId: id,
    officerId: officer.id,
    agencyCode,
    actorId: caller.id,
  });

  void notifyAssignmentChange({
    incidentId: id,
    newOfficerId: officer.id as string,
    newOfficerName: officer.name as string,
    previousOfficerId,
    row: updated as Record<string, unknown>,
  }).catch((err) => {
    logger.warn('assign_notify_failed', {
      requestId,
      incidentId: id,
      error: String(err),
    });
  });

  const body: ApiResponse<{ incident: Incident }> = {
    ok: true,
    data: { incident: mapIncident(updated as Record<string, unknown>) },
  };
  return NextResponse.json(body);
}

async function notifyAssignmentChange(input: {
  incidentId: string;
  newOfficerId: string;
  newOfficerName: string;
  previousOfficerId: string | null;
  row: Record<string, unknown>;
}): Promise<void> {
  const incident = mapIncident(input.row);
  const channels = defaultStaffChannels();

  // New assignee (skip noisy duplicate only if same person — still OK for self-claim)
  const assignMsg = officerAssignment(incident, input.newOfficerName);
  await dispatch({
    channels,
    incidentId: input.incidentId,
    eventType: 'officer.assigned',
    recipientUserIds: [input.newOfficerId],
    href: `/officer/case/${input.incidentId}`,
    payload: {
      subject: assignMsg.subject,
      body: assignMsg.body,
      data: { incidentId: input.incidentId, officerId: input.newOfficerId },
    },
  });

  // Previous officer lost the case
  if (
    input.previousOfficerId &&
    input.previousOfficerId !== input.newOfficerId
  ) {
    const leftMsg = officerUnassigned(incident, input.newOfficerName);
    await dispatch({
      channels,
      incidentId: input.incidentId,
      eventType: 'officer.unassigned',
      recipientUserIds: [input.previousOfficerId],
      href: `/officer/queue`,
      payload: {
        subject: leftMsg.subject,
        body: leftMsg.body,
        data: {
          incidentId: input.incidentId,
          previousOfficerId: input.previousOfficerId,
          newOfficerId: input.newOfficerId,
        },
      },
    });
  }
}

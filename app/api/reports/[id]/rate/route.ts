import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { rateLimit, clientIpFromHeaders } from '@/app/lib/rateLimit';
import { defaultStaffChannels, dispatch } from '@/app/lib/notifications/dispatcher';
import { officerCitizenRating } from '@/app/lib/notifications/templates';
import { mapIncident } from '@/app/lib/mappers/incident';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id: rawId } = await params;
  const id = normalizeReferenceId(rawId);

  const key = `rate:${clientIpFromHeaders(req.headers)}`;
  const rl = rateLimit(key, 10);
  if (!rl.allowed) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'RATE_LIMITED',
      error: 'Too many rating attempts. Please wait and try again.',
    };
    return NextResponse.json(body, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter ?? 60) },
    });
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
  const { score, comment } = parsed.data;

  const supabase = createServiceSupabase();

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

  if (incident.status !== 'resolved' && incident.status !== 'closed') {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'CONFLICT',
      error: 'You can only rate cases that have been resolved or closed.',
    };
    return NextResponse.json(body, { status: 409 });
  }

  if (incident.citizen_rating_score !== null) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'CONFLICT',
      error: 'This case has already been rated.',
    };
    return NextResponse.json(body, { status: 409 });
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('incidents')
    .update({
      citizen_rating_score: score,
      citizen_rating_comment: comment ?? null,
      citizen_rated_at: now,
      updated_at: now,
    })
    .eq('id', id);

  if (updateError) {
    logger.error('rate_update_failed', {
      requestId,
      incidentId: id,
      error: updateError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not save rating.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  await supabase.from('incident_events').insert({
    incident_id: id,
    type: 'incident.rated',
    actor_id: null,
    actor_name: 'Citizen',
    actor_role: 'public',
    is_public: true,
    payload: { score, comment: comment ?? null },
  });

  logger.info('citizen_rated', { requestId, incidentId: id, score });

  const assigneeId = incident.assigned_officer_id as string | null;
  if (assigneeId) {
    void (async () => {
      try {
        const mapped = mapIncident(incident as Record<string, unknown>);
        const msg = officerCitizenRating(mapped, score, comment ?? null);
        await dispatch({
          channels: defaultStaffChannels(),
          incidentId: id,
          eventType: 'incident.rated',
          recipientUserIds: [assigneeId],
          href: `/officer/case/${id}`,
          payload: {
            subject: msg.subject,
            body: msg.body,
            data: { incidentId: id, score },
          },
        });
      } catch (err) {
        logger.warn('rate_notify_failed', {
          requestId,
          incidentId: id,
          error: String(err),
        });
      }
    })();
  }

  const body: ApiResponse<{ score: number }> = {
    ok: true,
    data: { score },
  };
  return NextResponse.json(body);
}

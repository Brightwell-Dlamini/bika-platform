import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { mapEvent } from '@/app/lib/mappers/incident';
import type { ApiResponse, IncidentEvent } from '@/app/types';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  body: z.string().min(1).max(4000),
  isPublic: z.boolean().default(false),
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
  const { body: noteBody, isPublic: noteIsPublic } = parsed.data;

  const supabase = createServiceSupabase();

  const { data: incident, error: fetchError } = await supabase
    .from('incidents')
    .select('id')
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

  const { data: event, error: insertError } = await supabase
    .from('incident_events')
    .insert({
      incident_id: id,
      type: 'incident.note_added',
      actor_id: caller.id,
      actor_name: caller.name,
      actor_role: caller.role,
      is_public: noteIsPublic,
      payload: { note: noteBody },
    })
    .select()
    .single();

  if (insertError) {
    logger.error('note_insert_failed', {
      requestId,
      incidentId: id,
      error: insertError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not save note.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  await supabase.from('incidents').update({ updated_at: new Date().toISOString() }).eq('id', id);

  logger.info('note_added', {
    requestId,
    incidentId: id,
    actorId: caller.id,
    isPublic: noteIsPublic,
  });

  const body: ApiResponse<{ event: IncidentEvent }> = {
    ok: true,
    data: {
      event: mapEvent(event as Record<string, unknown>),
    },
  };
  return NextResponse.json(body);
}

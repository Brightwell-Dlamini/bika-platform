import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { isPublic } from '@/app/lib/rbac';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import { rateLimitAsync, clientIpFromHeaders } from '@/app/lib/rateLimit';
import { mapIncident, mapEvent, stripIncidentPII } from '@/app/lib/mappers/incident';
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
    const body: ApiResponse<never> = {
      ok: false,
      code: 'BAD_REQUEST',
      error: 'Missing reference id.',
    };
    return NextResponse.json(body, { status: 400 });
  }

  const caller = await getCallerProfile();
  const isPublicCaller = !caller || isPublic(caller.role);

  // Throttle public lookups (scraping / enumeration)
  if (isPublicCaller) {
    const key = `lookup:${clientIpFromHeaders(req.headers)}`;
    const rl = await rateLimitAsync(key, 30);
    if (!rl.allowed) {
      logger.warn('incident_lookup_rate_limited', { requestId, incidentId: id });
      const body: ApiResponse<never> = {
        ok: false,
        code: 'RATE_LIMITED',
        error: 'Too many lookups. Please wait a moment and try again.',
      };
      return NextResponse.json(body, {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter ?? 60) },
      });
    }
  }

  const supabase = createServiceSupabase();

  const { data: incident, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('incident_fetch_failed', {
      requestId,
      incidentId: id,
      error: error.message,
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
      error: 'Report not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }

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

  const mapped = mapIncident(incident as Record<string, unknown>);
  const sanitized = isPublicCaller ? stripIncidentPII(mapped) : mapped;

  const body: ApiResponse<DetailPayload> = {
    ok: true,
    data: {
      incident: sanitized,
      events: (events ?? []).map((e) => mapEvent(e as Record<string, unknown>)),
    },
  };
  return NextResponse.json(body);
}

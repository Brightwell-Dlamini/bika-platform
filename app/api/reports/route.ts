import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createServiceSupabase,
  getCallerProfile,
} from '@/app/lib/supabase/server';
import {
  zCitizenReportSubmission,
  parseOrThrow,
  ValidationError,
} from '@/app/lib/schemas';
import { generateReferenceId } from '@/app/lib/utils/referenceId';
import { runIncidentAutomation } from '@/app/lib/automation/incident';
import { dispatch } from '@/app/lib/notifications/dispatcher';
import { citizenReceipt } from '@/app/lib/notifications/templates';
import { logger, newRequestId } from '@/app/lib/logger';
import { isPublic, isOfficer, isSuperAdmin, isAdmin } from '@/app/lib/rbac';
import { rateLimit, clientIpFromHeaders } from '@/app/lib/rateLimit';
import { mapIncident } from '@/app/lib/mappers/incident';
import type { ApiResponse, Incident } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const key = clientIpFromHeaders(req.headers);
  const rl = rateLimit(key, 6);

  if (!rl.allowed) {
    logger.warn('report_rate_limited', { requestId, clientKey: key.slice(0, 16) });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'RATE_LIMITED',
      error: 'Too many reports from this network. Please wait and try again.',
    };
    return NextResponse.json(body, {
      status: 429,
      headers: {
        'Retry-After': String(rl.retryAfter ?? 60),
        'X-RateLimit-Limit': '6',
        'X-RateLimit-Remaining': '0',
      },
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

  let input: z.infer<typeof zCitizenReportSubmission>;
  try {
    input = parseOrThrow(zCitizenReportSubmission, json, 'Report submission');
  } catch (err) {
    if (err instanceof ValidationError) {
      const body: ApiResponse<never> = {
        ok: false,
        code: err.code,
        error: err.message,
        details: err.details,
      };
      return NextResponse.json(body, { status: 400 });
    }
    throw err;
  }

  const supabase = createServiceSupabase();
  const id = generateReferenceId();
  const now = new Date().toISOString();

  const row = {
    id,
    report_type: input.reportType,
    category: input.category,
    mode: input.mode,
    region: input.region,
    location: input.location,
    description: input.description,
    severity: input.severity,
    status: 'submitted' as const,

    reporter_name: input.isAnonymous ? null : input.reporterName ?? null,
    reporter_phone: input.isAnonymous ? null : input.reporterPhone ?? null,
    reporter_email: input.isAnonymous ? null : input.reporterEmail ?? null,
    is_anonymous: input.isAnonymous,

    vehicle_registration: input.vehicleRegistration ?? null,
    operator_name: input.operatorName ?? null,
    driver_name: input.driverName ?? null,
    establishment_name: input.establishmentName ?? null,

    coordinates: input.coordinates ?? null,
    attachments: input.attachments,

    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('incidents')
    .insert(row)
    .select()
    .single();

  if (insertError) {
    logger.error('report_insert_failed', {
      requestId,
      incidentId: id,
      error: insertError.message,
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not save your report. Please try again.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  await supabase.from('incident_events').insert({
    incident_id: id,
    type: 'incident.submitted',
    actor_id: null,
    actor_name: input.isAnonymous ? 'Anonymous Citizen' : input.reporterName || 'Citizen',
    actor_role: 'public',
    is_public: true,
    payload: {
      reportType: input.reportType,
      mode: input.mode,
      region: input.region,
      severity: input.severity,
    },
  });

  logger.info('report_created', {
    requestId,
    incidentId: id,
    region: input.region,
    severity: input.severity,
    reportType: input.reportType,
  });

  let automation: Awaited<ReturnType<typeof runIncidentAutomation>> | null = null;
  try {
    automation = await runIncidentAutomation(id, { isCreate: true });
    logger.info('report_automation_ok', {
      requestId,
      incidentId: id,
      agencyCode: automation.agencyCode,
      assigned: Boolean(automation.assignedOfficerId),
      officerName: automation.assignedOfficerName,
    });
  } catch (err) {
    logger.error('report_automation_failed', {
      requestId,
      incidentId: id,
      error: String(err),
    });
  }

  if (!input.isAnonymous && (input.reporterPhone || input.reporterEmail)) {
    try {
      const receiptMsg = citizenReceipt(mapIncident(inserted as Record<string, unknown>));
      await dispatch({
        channels: ['webhook', 'email', 'sms'],
        incidentId: id,
        eventType: 'citizen.receipt',
        payload: {
          subject: receiptMsg.subject,
          body: receiptMsg.body,
          toPhone: input.reporterPhone ?? undefined,
          toEmail: input.reporterEmail ?? undefined,
          data: { incidentId: id },
        },
      });
    } catch (err) {
      logger.warn('citizen_receipt_failed', {
        requestId,
        incidentId: id,
        error: String(err),
      });
    }
  }

  let finalRow = inserted as Record<string, unknown>;
  if (automation?.assignedOfficerId || automation?.agencyCode) {
    const { data: refreshed } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (refreshed) finalRow = refreshed as Record<string, unknown>;
  }

  const body: ApiResponse<{ incident: Incident }> = {
    ok: true,
    data: { incident: mapIncident(finalRow) },
  };
  return NextResponse.json(body, {
    status: 201,
    headers: {
      'X-RateLimit-Limit': '6',
      'X-RateLimit-Remaining': String(rl.remaining),
    },
  });
}

const listQuerySchema = z.object({
  region: z.string().optional(),
  mode: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  agencyCode: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().max(200).optional(),
  onlyOverdue: z.enum(['true', 'false']).optional(),
  onlyUnassigned: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export async function GET(req: NextRequest) {
  const requestId = newRequestId();

  const caller = await getCallerProfile();
  const isPublicCaller = !caller || isPublic(caller.role);

  if (isPublicCaller) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Listing incidents requires an authenticated official account.',
    };
    return NextResponse.json(body, { status: 403 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  let query: z.infer<typeof listQuerySchema>;
  try {
    query = parseOrThrow(listQuerySchema, params, 'List query');
  } catch (err) {
    if (err instanceof ValidationError) {
      const body: ApiResponse<never> = {
        ok: false,
        code: err.code,
        error: err.message,
        details: err.details,
      };
      return NextResponse.json(body, { status: 400 });
    }
    throw err;
  }

  const supabase = createServiceSupabase();

  let q = supabase
    .from('incidents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(query.limit);

  if (query.region) q = q.eq('region', query.region);
  if (query.mode) q = q.eq('mode', query.mode);
  if (query.status) q = q.eq('status', query.status);
  if (query.severity) q = q.eq('severity', query.severity);
  if (query.agencyCode) q = q.eq('assigned_agency_code', query.agencyCode);
  if (query.assignedTo) q = q.eq('assigned_officer_id', query.assignedTo);
  if (query.onlyUnassigned === 'true') {
    q = q.is('assigned_officer_id', null);
  }
  if (query.onlyOverdue === 'true') {
    q = q
      .lt('sla_due_at', new Date().toISOString())
      .not('status', 'in', '(closed,resolved,rejected)');
  }
  if (query.search) {
    const safe = query.search.replace(/[%_]/g, '');
    q = q.or(
      `id.ilike.%${safe}%,location.ilike.%${safe}%,description.ilike.%${safe}%,vehicle_registration.ilike.%${safe}%,establishment_name.ilike.%${safe}%`
    );
  }

  if (!query.region && !query.agencyCode && !query.assignedTo && query.onlyUnassigned !== 'true') {
    if (isOfficer(caller.role) && !isSuperAdmin(caller.role) && !isAdmin(caller.role)) {
      const region = caller.region !== 'Nationwide' ? caller.region : null;
      const agency = caller.agencyCode;
      if (region && agency) {
        q = q.or(
          `and(region.eq.${region},assigned_agency_code.eq.${agency}),assigned_officer_id.eq.${caller.id}`
        );
      } else if (region) {
        q = q.or(`region.eq.${region},assigned_officer_id.eq.${caller.id}`);
      } else if (agency) {
        q = q.or(
          `assigned_agency_code.eq.${agency},assigned_officer_id.eq.${caller.id}`
        );
      }
    }
  }

  const { data, error, count } = await q;
  if (error) {
    logger.error('report_list_failed', { requestId, error: error.message });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'DB_ERROR',
      error: 'Could not load incidents.',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const body: ApiResponse<{ incidents: Incident[]; total: number }> = {
    ok: true,
    data: {
      incidents: (data ?? []).map((row) => mapIncident(row as Record<string, unknown>)),
      total: count ?? data?.length ?? 0,
    },
  };
  return NextResponse.json(body);
}

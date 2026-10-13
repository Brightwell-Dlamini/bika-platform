import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { dispatch } from '@/app/lib/notifications/dispatcher';
import { citizenReceipt } from '@/app/lib/notifications/templates';
import { normalizeReferenceId } from '@/app/lib/utils/referenceId';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse, Incident } from '@/app/types';

export const dynamic = 'force-dynamic';

// Rate limit: one receipt per incident per 5 minutes
const RECEIPT_COOLDOWN_MS = 5 * 60_000;
const recentReceipts = new Map<string, number>();

const bodySchema = z.object({
  incidentId: z.string().min(1),
  channels: z
    .array(z.enum(['webhook', 'email', 'sms']))
    .min(1)
    .default(['webhook', 'email', 'sms']),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

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

  const id = normalizeReferenceId(parsed.data.incidentId);

  // Cooldown check
  const now = Date.now();
  const lastSent = recentReceipts.get(id);
  if (lastSent && now - lastSent < RECEIPT_COOLDOWN_MS) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'RATE_LIMITED',
      error: 'A receipt was sent recently. Please wait a few minutes.',
    };
    return NextResponse.json(body, { status: 429 });
  }

  const supabase = createServiceSupabase();
  const { data: row, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'NOT_FOUND',
      error: 'Report not found.',
    };
    return NextResponse.json(body, { status: 404 });
  }

  const incident = mapIncident(row);

  // Anonymous reports have no contact — skip
  if (incident.isAnonymous || (!incident.reporterPhone && !incident.reporterEmail)) {
    const body: ApiResponse<{ delivered: false; reason: string }> = {
      ok: true,
      data: { delivered: false, reason: 'no_contact_info' },
    };
    return NextResponse.json(body);
  }

  const msg = citizenReceipt(incident);
  const result = await dispatch({
    channels: parsed.data.channels,
    incidentId: id,
    eventType: 'citizen.receipt',
    payload: {
      subject: msg.subject,
      body: msg.body,
      toPhone: incident.reporterPhone ?? undefined,
      toEmail: incident.reporterEmail ?? undefined,
      data: { incidentId: id },
    },
  });

  recentReceipts.set(id, now);

  logger.info('citizen_receipt_sent', {
    requestId,
    incidentId: id,
    delivered: result.delivered,
  });

  const body: ApiResponse<typeof result> = { ok: true, data: result };
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

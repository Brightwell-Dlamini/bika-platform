import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/app/lib/env';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { generateReferenceId } from '@/app/lib/utils/referenceId';
import { runIncidentAutomation } from '@/app/lib/automation/incident';
import { logger, newRequestId } from '@/app/lib/logger';
import { rateLimit, clientIpFromHeaders } from '@/app/lib/rateLimit';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * USSD gateway entry.
 * Authenticate with header: X-USSD-Secret: <USSD_WEBHOOK_SECRET>
 * Minimal session protocol for feature-phone partners.
 */
const bodySchema = z.object({
  sessionId: z.string().min(1).max(64),
  phoneNumber: z.string().min(8).max(20),
  text: z.string().max(500).default(''),
  serviceCode: z.string().max(32).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  if (!env.USSD_WEBHOOK_SECRET) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'SERVICE_UNAVAILABLE',
      error: 'USSD channel is not configured.',
    };
    return NextResponse.json(body, { status: 503 });
  }

  const secret = req.headers.get('x-ussd-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (secret !== env.USSD_WEBHOOK_SECRET) {
    logger.warn('ussd_auth_failed', { requestId });
    const body: ApiResponse<never> = { ok: false, code: 'UNAUTHORIZED', error: 'Invalid USSD secret.' };
    return NextResponse.json(body, { status: 401 });
  }

  const rl = rateLimit(`ussd:${clientIpFromHeaders(req.headers)}`, 30);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', error: 'Too many USSD requests.' } satisfies ApiResponse<never>,
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_JSON', error: 'Invalid JSON.' } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: 'VALIDATION_FAILED',
        error: parsed.error.issues.map((i) => i.message).join('; '),
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { text, phoneNumber } = parsed.data;
  const steps = text.split('*').filter(Boolean);

  // Menu: 1=Report transport 2=Report food 3=Track
  if (steps.length === 0) {
    return ussdContinue(
      'CON BIKA Eswatini\n1. Report transport\n2. Report food/trade\n3. Track with ID'
    );
  }

  const choice = steps[0];

  if (choice === '3') {
    if (steps.length < 2) {
      return ussdContinue('CON Enter BIKA reference ID:');
    }
    const id = steps[1]!.trim().toUpperCase();
    try {
      const supabase = createServiceSupabase();
      const { data } = await supabase
        .from('incidents')
        .select('id, status, category, location')
        .eq('id', id)
        .maybeSingle();
      if (!data) {
        return ussdEnd('END Report not found. Check the ID and try again.');
      }
      return ussdEnd(
        `END ${data.id}\nStatus: ${data.status}\n${data.category}\n${data.location}`
      );
    } catch (err) {
      logger.error('ussd_track_failed', { requestId, error: String(err) });
      return ussdEnd('END Service error. Try later.');
    }
  }

  if (choice === '1' || choice === '2') {
    // 1*region*location*description
    if (steps.length < 4) {
      if (steps.length === 1) return ussdContinue('CON Region (Hhohho/Manzini/Shiselweni/Lubombo):');
      if (steps.length === 2) return ussdContinue('CON Location / rank / shop:');
      return ussdContinue('CON Short description:');
    }

    const regionRaw = steps[1]!;
    const location = steps[2]!.slice(0, 200);
    const description = steps[3]!.slice(0, 500);
    const region = normalizeRegion(regionRaw);
    const mode = choice === '1' ? 'Road Transport' : 'Restaurant/Food';
    const category =
      choice === '1' ? 'USSD Transport Report' : 'USSD Food/Trade Report';

    try {
      const supabase = createServiceSupabase();
      const id = generateReferenceId();
      const now = new Date().toISOString();

      const { error } = await supabase.from('incidents').insert({
        id,
        report_type: 'incident',
        category,
        mode,
        region,
        location,
        description,
        severity: 'MEDIUM',
        status: 'submitted',
        reporter_phone: phoneNumber,
        is_anonymous: false,
        attachments: [],
        created_at: now,
        updated_at: now,
      });

      if (error) {
        logger.error('ussd_insert_failed', { requestId, error: error.message });
        return ussdEnd('END Could not save report. Try again later.');
      }

      await supabase.from('incident_events').insert({
        incident_id: id,
        type: 'incident.submitted',
        actor_id: null,
        actor_name: 'USSD Citizen',
        actor_role: 'public',
        is_public: true,
        payload: { channel: 'ussd', phone: phoneNumber.slice(-4) },
      });

      void runIncidentAutomation(id, { isCreate: true }).catch(() => {});

      logger.info('ussd_report_created', { requestId, incidentId: id, mode });
      return ussdEnd(`END Report saved.\nRef: ${id}\nKeep this ID to track.`);
    } catch (err) {
      logger.error('ussd_submit_failed', { requestId, error: String(err) });
      return ussdEnd('END Service error. Try later.');
    }
  }

  return ussdEnd('END Invalid option.');
}

function normalizeRegion(raw: string): string {
  const r = raw.trim().toLowerCase();
  if (r.startsWith('hh')) return 'Hhohho';
  if (r.startsWith('ma')) return 'Manzini';
  if (r.startsWith('sh')) return 'Shiselweni';
  if (r.startsWith('lu')) return 'Lubombo';
  return 'Manzini';
}

function ussdContinue(message: string) {
  return new NextResponse(message, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function ussdEnd(message: string) {
  return new NextResponse(message, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runIncidentAutomation } from '@/app/lib/automation/incident';
import { logger, newRequestId } from '@/app/lib/logger';
import { env } from '@/app/lib/env';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  incidentId: z.string().min(1),
  isCreate: z.boolean().default(false),
});

/**
 * POST — run automation for an incident.
 *
 * This route is called internally by:
 *   - /api/reports POST        (after citizen submission)
 *   - /api/reports/[id]/transition POST  (after status change)
 *   - /api/reports/[id]/assign POST      (after assignment)
 *
 * It's not intended to be called by the browser. Guarded by a shared
 * secret so external parties can't spam it. The secret is the same
 * NEXT_PUBLIC_SITE_URL used to construct the self-fetch in the caller.
 * If not set, the route is disabled in production.
 */
export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  // Production guard: require the internal secret if configured
  const internalSecret = req.headers.get('x-bika-internal');
  const expectedSecret = env.USSD_WEBHOOK_SECRET; // reuse as internal key for now
  if (env.NODE_ENV === 'production' && expectedSecret && internalSecret !== expectedSecret) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Automation endpoint is internal only.',
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
    };
    return NextResponse.json(body, { status: 400 });
  }

  try {
    const result = await runIncidentAutomation(parsed.data.incidentId, {
      isCreate: parsed.data.isCreate,
    });
    const body: ApiResponse<typeof result> = { ok: true, data: result };
    return NextResponse.json(body);
  } catch (err) {
    logger.error('automation_route_threw', {
      requestId,
      incidentId: parsed.data.incidentId,
      error: String(err),
    });
    const body: ApiResponse<never> = {
      ok: false,
      code: 'INTERNAL_ERROR',
      error: 'Automation failed.',
    };
    return NextResponse.json(body, { status: 500 });
  }
}

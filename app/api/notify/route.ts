import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerProfile } from '@/app/lib/supabase/server';
import { canRunWork } from '@/app/lib/rbac';
import { dispatch } from '@/app/lib/notifications/dispatcher';
import type { ChannelName } from '@/app/lib/notifications/channels';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  incidentId: z.string().optional(),
  eventType: z.string().min(1).max(80),
  channels: z
    .array(z.enum(['webhook', 'email', 'sms']))
    .min(1)
    .default(['webhook']),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  toPhone: z.string().max(40).optional(),
  toEmail: z.string().email().max(320).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = newRequestId();

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunWork(caller.role)) {
    const body: ApiResponse<never> = {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Admin or Super Admin required.',
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
  const input = parsed.data;

  const result = await dispatch({
    channels: input.channels as ChannelName[],
    incidentId: input.incidentId,
    eventType: input.eventType,
    payload: {
      subject: input.subject,
      body: input.body,
      toPhone: input.toPhone,
      toEmail: input.toEmail,
      data: { sentBy: caller.name, sentByRole: caller.role },
    },
  });

  logger.info('manual_notify', {
    requestId,
    incidentId: input.incidentId,
    channels: input.channels,
    delivered: result.delivered,
    actorId: caller.id,
  });

  const body: ApiResponse<typeof result> = { ok: true, data: result };
  return NextResponse.json(body);
}

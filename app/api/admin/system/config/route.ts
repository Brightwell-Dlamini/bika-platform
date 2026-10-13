import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase, getCallerProfile } from '@/app/lib/supabase/server';
import { canRunSystem } from '@/app/lib/rbac';
import { logger, newRequestId } from '@/app/lib/logger';
import type { ApiResponse } from '@/app/types';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  appName: z.string().min(1).max(80).optional(),
  subTitle: z.string().max(200).optional(),
  maxImageSizeBytes: z.number().int().min(100_000).max(10_000_000).optional(),
  allowedImageFormats: z.array(z.string()).optional(),
  sessionTimeoutMins: z.number().int().min(5).max(480).optional(),
  offlineSyncEnabled: z.boolean().optional(),
  whatsappGatewayUrl: z.string().url().optional().nullable(),
  smsGatewayKey: z.string().max(200).optional().nullable(),
  emailSmtpHost: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const requestId = newRequestId();

  const caller = await getCallerProfile();
  if (!caller) {
    const body: ApiResponse<never> = { ok: false, code: 'UNAUTHORIZED', error: 'Authentication required.' };
    return NextResponse.json(body, { status: 401 });
  }
  if (!canRunSystem(caller.role)) {
    const body: ApiResponse<never> = { ok: false, code: 'FORBIDDEN', error: 'Super Admin only.' };
    return NextResponse.json(body, { status: 403 });
  }

  let json: unknown;
  try { json = await req.json(); } catch {
    const body: ApiResponse<never> = { ok: false, code: 'INVALID_JSON', error: 'Invalid JSON.' };
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

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.appName !== undefined) patch.app_name = input.appName;
  if (input.subTitle !== undefined) patch.sub_title = input.subTitle;
  if (input.maxImageSizeBytes !== undefined) patch.max_image_size_bytes = input.maxImageSizeBytes;
  if (input.allowedImageFormats !== undefined) patch.allowed_image_formats = input.allowedImageFormats;
  if (input.sessionTimeoutMins !== undefined) patch.session_timeout_mins = input.sessionTimeoutMins;
  if (input.offlineSyncEnabled !== undefined) patch.offline_sync_enabled = input.offlineSyncEnabled;
  if (input.whatsappGatewayUrl !== undefined) patch.whatsapp_gateway_url = input.whatsappGatewayUrl;
  if (input.smsGatewayKey !== undefined) patch.sms_gateway_key = input.smsGatewayKey;
  if (input.emailSmtpHost !== undefined) patch.email_smtp_host = input.emailSmtpHost;

  const admin = createServiceSupabase();
  const { data, error } = await admin
    .from('system_config')
    .update(patch)
    .eq('id', 'default')
    .select()
    .single();

  if (error || !data) {
    logger.error('config_update_failed', { requestId, error: error?.message });
    const body: ApiResponse<never> = { ok: false, code: 'DB_ERROR', error: error?.message ?? 'Could not save config.' };
    return NextResponse.json(body, { status: 500 });
  }

  await admin.from('audit_logs').insert({
    user_id: caller.id,
    user_name: caller.name,
    user_role: caller.role,
    action: 'UPDATE_CONFIG',
    target_id: 'default',
    details: `Fields: ${Object.keys(patch).filter((k) => k !== 'updated_at').join(', ')}`,
  });

  const body: ApiResponse<{ config: typeof data }> = { ok: true, data: { config: data } };
  return NextResponse.json(body);
}

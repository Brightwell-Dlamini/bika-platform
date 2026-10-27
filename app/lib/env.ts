/**
 * BIKA v2 — Typed, boot-validated environment access.
 */

import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  CRON_SECRET: z.string().min(16).optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10).optional(),

  NOTIFY_WEBHOOK_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  NOTIFY_FROM_EMAIL: z.string().email().optional(),
  NOTIFY_TO_EMAIL: z.string().email().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  NOTIFY_SMS_TO: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),

  USSD_WEBHOOK_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadServerEnv(): ServerEnv {
  const raw = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  };

  const parsed = serverSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[BIKA] Invalid server environment:\n${issues}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
    if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)');

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        '[BIKA/env] SUPABASE_SERVICE_ROLE_KEY missing in production. ' +
          'Admin routes (/api/admin/*) will return 503.'
      );
    }

    if (!env.CRON_SECRET && !env.USSD_WEBHOOK_SECRET) {
      console.warn(
        '[BIKA/env] CRON_SECRET missing in production. ' +
          'SLA cron (/api/cron/sla-check) will reject authenticated runs until set.'
      );
    }

    if (!env.USSD_WEBHOOK_SECRET) {
      console.error(
        '[BIKA/env] CRITICAL: USSD_WEBHOOK_SECRET missing in production. ' +
          'The /api/ussd endpoint will reject all requests until set.'
      );
    }

    if (missing.length > 0) {
      throw new Error(
        `[BIKA] Missing required production env vars:\n${missing.map((m) => `  - ${m}`).join('\n')}`
      );
    }
  }

  return env;
}

export const env: ServerEnv = loadServerEnv();

export const publicEnv = {
  SUPABASE_URL:
    env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') ||
    '',
  SUPABASE_ANON_KEY:
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') ||
    '',
} as const;

export function isSupabaseConfigured(): boolean {
  const url = publicEnv.SUPABASE_URL;
  const key = publicEnv.SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith('http') &&
      !url.includes('your-project') &&
      key.length >= 20
  );
}

export function hasServiceRole(): boolean {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL);
}

export interface EnvHealth {
  ok: boolean;
  node: string;
  nodeOk: boolean;
  supabasePublicConfigured: boolean;
  supabaseServiceRoleConfigured: boolean;
  notifications: {
    inApp: boolean;
    push: boolean;
    webhook: boolean;
    email: boolean;
    sms: boolean;
  };
  cronSecretConfigured: boolean;
  ussdSecretConfigured: boolean;
}

export function getEnvHealth(): EnvHealth {
  const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);
  const vapid =
    Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) ||
    Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

  return {
    ok: isSupabaseConfigured() && nodeMajor >= 20,
    node: process.versions.node,
    nodeOk: nodeMajor >= 20,
    supabasePublicConfigured: isSupabaseConfigured(),
    supabaseServiceRoleConfigured: hasServiceRole(),
    notifications: {
      inApp: true,
      push: vapid,
      webhook: Boolean(env.NOTIFY_WEBHOOK_URL),
      email: Boolean(env.RESEND_API_KEY && env.NOTIFY_TO_EMAIL),
      sms: Boolean(
        env.TWILIO_ACCOUNT_SID &&
          env.TWILIO_AUTH_TOKEN &&
          env.TWILIO_FROM &&
          env.NOTIFY_SMS_TO
      ),
    },
    cronSecretConfigured: Boolean(env.CRON_SECRET || env.USSD_WEBHOOK_SECRET),
    ussdSecretConfigured: Boolean(env.USSD_WEBHOOK_SECRET),
  };
}

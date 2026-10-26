import 'server-only';
import { env } from '@/app/lib/env';
import { logger } from '@/app/lib/logger';
import { createServiceSupabase } from '@/app/lib/supabase/server';

/**
 * BIKA notification channels.
 * Primary: in_app + push. Legacy webhook/email/sms remain optional and unused by defaults.
 */

export type ChannelName = 'in_app' | 'push' | 'webhook' | 'email' | 'sms';

export interface NotificationPayload {
  subject: string;
  body: string;
  toPhone?: string;
  toEmail?: string;
  /** Profile IDs (TEXT) that should receive in_app / push. */
  recipientUserIds?: string[];
  href?: string;
  incidentId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

export interface ChannelResult {
  channel: ChannelName;
  status: string;
}

// -----------------------------------------------------------------------------
// In-app — persist to notifications table
// -----------------------------------------------------------------------------

export async function sendInApp(payload: NotificationPayload): Promise<ChannelResult> {
  const ids = payload.recipientUserIds?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return { channel: 'in_app', status: 'skipped_no_recipient' };
  }

  try {
    const supabase = createServiceSupabase();
    const rows = ids.map((userId) => ({
      user_id: userId,
      title: payload.subject.slice(0, 200),
      body: payload.body.slice(0, 2000),
      href: payload.href ?? null,
      incident_id: payload.incidentId ?? null,
      event_type: payload.eventType ?? 'general',
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      logger.warn('notify_in_app_failed', { error: error.message, count: ids.length });
      return { channel: 'in_app', status: 'error' };
    }
    return { channel: 'in_app', status: 'sent' };
  } catch (err) {
    logger.warn('notify_in_app_threw', { error: String(err) });
    return { channel: 'in_app', status: 'error' };
  }
}

// -----------------------------------------------------------------------------
// Web Push — requires VAPID keys + web-push package
// -----------------------------------------------------------------------------

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number }
  ) => Promise<unknown>;
};

function loadWebPush(): WebPushModule | null {
  try {
    // CJS require — package is listed in serverExternalPackages
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('web-push') as WebPushModule;
  } catch {
    return null;
  }
}

export async function sendPush(payload: NotificationPayload): Promise<ChannelResult> {
  const ids = payload.recipientUserIds?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return { channel: 'push', status: 'skipped_no_recipient' };
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:ops@bika.gov.sz';

  if (!publicKey || !privateKey) {
    return { channel: 'push', status: 'skipped_not_configured' };
  }

  const webpush = loadWebPush();
  if (!webpush) {
    return { channel: 'push', status: 'skipped_no_module' };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const supabase = createServiceSupabase();
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', ids);

    if (error || !subs?.length) {
      return { channel: 'push', status: subs?.length ? 'error' : 'skipped_no_subscription' };
    }

    const body = JSON.stringify({
      title: payload.subject.slice(0, 120),
      body: payload.body.slice(0, 180),
      href: payload.href ?? '/officer',
      incidentId: payload.incidentId ?? null,
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
          },
          body,
          { TTL: 60 * 60 }
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          logger.warn('notify_push_one_failed', {
            endpoint: String(sub.endpoint).slice(0, 48),
            statusCode,
          });
        }
      }
    }

    return { channel: 'push', status: sent > 0 ? 'sent' : 'error' };
  } catch (err) {
    logger.warn('notify_push_threw', { error: String(err) });
    return { channel: 'push', status: 'error' };
  }
}

// -----------------------------------------------------------------------------
// Legacy optional channels (not used by default)
// -----------------------------------------------------------------------------

export async function sendWebhook(payload: NotificationPayload): Promise<ChannelResult> {
  if (!env.NOTIFY_WEBHOOK_URL) return { channel: 'webhook', status: 'skipped' };
  try {
    const res = await fetch(env.NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'bika',
        subject: payload.subject,
        body: payload.body,
        data: payload.data ?? {},
        timestamp: new Date().toISOString(),
      }),
    });
    return { channel: 'webhook', status: res.ok ? 'sent' : `http_${res.status}` };
  } catch (err) {
    logger.warn('notify_webhook_failed', { error: String(err) });
    return { channel: 'webhook', status: 'error' };
  }
}

export async function sendEmail(payload: NotificationPayload): Promise<ChannelResult> {
  if (!env.RESEND_API_KEY) return { channel: 'email', status: 'skipped' };
  const to = payload.toEmail ?? env.NOTIFY_TO_EMAIL;
  if (!to) return { channel: 'email', status: 'skipped_no_recipient' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.NOTIFY_FROM_EMAIL ?? 'BIKA <onboarding@resend.dev>',
        to: [to],
        subject: payload.subject,
        text: payload.body,
      }),
    });
    return { channel: 'email', status: res.ok ? 'sent' : `http_${res.status}` };
  } catch (err) {
    logger.warn('notify_email_failed', { error: String(err) });
    return { channel: 'email', status: 'error' };
  }
}

export async function sendSms(payload: NotificationPayload): Promise<ChannelResult> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    return { channel: 'sms', status: 'skipped' };
  }
  const to = payload.toPhone ?? env.NOTIFY_SMS_TO;
  if (!to) return { channel: 'sms', status: 'skipped_no_recipient' };
  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams({
      To: to,
      From: TWILIO_FROM,
      Body: payload.body.slice(0, 300),
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    return { channel: 'sms', status: res.ok ? 'sent' : `http_${res.status}` };
  } catch (err) {
    logger.warn('notify_sms_failed', { error: String(err) });
    return { channel: 'sms', status: 'error' };
  }
}

export const CHANNELS: Record<
  ChannelName,
  (payload: NotificationPayload) => Promise<ChannelResult>
> = {
  in_app: sendInApp,
  push: sendPush,
  webhook: sendWebhook,
  email: sendEmail,
  sms: sendSms,
};

export function isChannelConfigured(channel: ChannelName): boolean {
  switch (channel) {
    case 'in_app':
      return true;
    case 'push':
      return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    case 'webhook':
      return Boolean(env.NOTIFY_WEBHOOK_URL);
    case 'email':
      return Boolean(env.RESEND_API_KEY);
    case 'sms':
      return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);
  }
}

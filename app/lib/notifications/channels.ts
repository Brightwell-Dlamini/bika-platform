import 'server-only';
import { env } from '@/app/lib/env';
import { logger } from '@/app/lib/logger';

/**
 * BIKA v2 — Notification channel adapters.
 *
 * Each adapter:
 * - Accepts a normalized payload
 * - Returns a small status string ('sent', 'skipped', 'error: ...', 'http_500')
 * - Never throws — failures are captured and reported, not propagated
 *
 * The dispatcher decides which channels to call. This file just delivers.
 */

export type ChannelName = 'webhook' | 'email' | 'sms';

export interface NotificationPayload {
  /** Short subject line for email/SMS. */
  subject: string;
  /** Full message body. SMS will be truncated. */
  body: string;
  /** Optional recipient overrides. Falls back to env defaults. */
  toPhone?: string;
  toEmail?: string;
  /** Free-form data included in webhook payload. */
  data?: Record<string, unknown>;
}

export interface ChannelResult {
  channel: ChannelName;
  status: string;
}

// -----------------------------------------------------------------------------
// Webhook — generic POST to a configurable URL
// -----------------------------------------------------------------------------

export async function sendWebhook(payload: NotificationPayload): Promise<ChannelResult> {
  if (!env.NOTIFY_WEBHOOK_URL) {
    return { channel: 'webhook', status: 'skipped' };
  }
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

// -----------------------------------------------------------------------------
// Email via Resend
// -----------------------------------------------------------------------------

export async function sendEmail(payload: NotificationPayload): Promise<ChannelResult> {
  if (!env.RESEND_API_KEY) {
    return { channel: 'email', status: 'skipped' };
  }
  const to = payload.toEmail ?? env.NOTIFY_TO_EMAIL;
  if (!to) {
    return { channel: 'email', status: 'skipped_no_recipient' };
  }
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

// -----------------------------------------------------------------------------
// SMS via Twilio
// -----------------------------------------------------------------------------

export async function sendSms(payload: NotificationPayload): Promise<ChannelResult> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    return { channel: 'sms', status: 'skipped' };
  }
  const to = payload.toPhone ?? env.NOTIFY_SMS_TO;
  if (!to) {
    return { channel: 'sms', status: 'skipped_no_recipient' };
  }
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

// -----------------------------------------------------------------------------
// Channel registry
// -----------------------------------------------------------------------------

export const CHANNELS: Record<ChannelName, (payload: NotificationPayload) => Promise<ChannelResult>> = {
  webhook: sendWebhook,
  email: sendEmail,
  sms: sendSms,
};

export function isChannelConfigured(channel: ChannelName): boolean {
  switch (channel) {
    case 'webhook':
      return Boolean(env.NOTIFY_WEBHOOK_URL);
    case 'email':
      return Boolean(env.RESEND_API_KEY);
    case 'sms':
      return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);
  }
}

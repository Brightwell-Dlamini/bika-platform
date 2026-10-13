import 'server-only';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import { CHANNELS, isChannelConfigured, type ChannelName, type NotificationPayload, type ChannelResult } from './channels';
import { logger } from '@/app/lib/logger';

export interface DispatchOptions {
  channels: ChannelName[];
  incidentId?: string;
  eventType: string;
  payload: NotificationPayload;
}

export interface DispatchResult {
  results: ChannelResult[];
  /** True if at least one channel was attempted and succeeded. */
  delivered: boolean;
}

/**
 * Send a notification through the requested channels and log the result.
 * Never throws. The caller always gets a result object.
 */
export async function dispatch(options: DispatchOptions): Promise<DispatchResult> {
  const { channels, incidentId, eventType, payload } = options;

  const attempted = channels.filter((c) => isChannelConfigured(c));
  const skippedUnconfigured = channels.filter((c) => !isChannelConfigured(c));

  const results: ChannelResult[] = [];

  if (attempted.length === 0 && skippedUnconfigured.length > 0) {
    // Nothing configured — record as logged_only
    const result: DispatchResult = {
      results: skippedUnconfigured.map((c) => ({ channel: c, status: 'skipped_not_configured' })),
      delivered: false,
    };
    await persistLog({ incidentId, eventType, payload, results: result.results });
    return result;
  }

  const settled = await Promise.all(
    attempted.map(async (channel) => {
      try {
        return await CHANNELS[channel](payload);
      } catch (err) {
        logger.error('notify_channel_threw', { channel, error: String(err) });
        return { channel, status: 'error' };
      }
    })
  );

  results.push(...settled);
  results.push(...skippedUnconfigured.map((c) => ({ channel: c, status: 'skipped_not_configured' as const })));

  const delivered = results.some((r) => r.status === 'sent');

  await persistLog({ incidentId, eventType, payload, results });

  return { results, delivered };
}

// -----------------------------------------------------------------------------
// Persistence
// -----------------------------------------------------------------------------

interface PersistLogInput {
  incidentId?: string;
  eventType: string;
  payload: NotificationPayload;
  results: ChannelResult[];
}

async function persistLog(input: PersistLogInput): Promise<void> {
  try {
    const supabase = createServiceSupabase();
    await supabase.from('notification_log').insert({
      event: input.eventType,
      incident_id: input.incidentId ?? null,
      channels: input.results.map((r) => r.channel),
      message: input.payload.body.slice(0, 1000),
      delivery_result: {
        results: input.results,
        subject: input.payload.subject,
        toPhone: Boolean(input.payload.toPhone),
        toEmail: Boolean(input.payload.toEmail),
      },
    });
  } catch (err) {
    // Notification log failure must never break the caller
    logger.warn('notification_log_failed', { error: String(err) });
  }
}

// -----------------------------------------------------------------------------
// Convenience: default channels for a severity
// -----------------------------------------------------------------------------

export function defaultChannelsForSeverity(severity: string): ChannelName[] {
  switch (severity) {
    case 'CRITICAL':
      return ['webhook', 'email', 'sms'];
    case 'HIGH':
      return ['webhook', 'email'];
    case 'MEDIUM':
      return ['webhook'];
    default:
      return [];
  }
}

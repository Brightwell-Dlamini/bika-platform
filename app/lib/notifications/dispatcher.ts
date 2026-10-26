import 'server-only';
import { createServiceSupabase } from '@/app/lib/supabase/server';
import {
  CHANNELS,
  isChannelConfigured,
  type ChannelName,
  type NotificationPayload,
  type ChannelResult,
} from './channels';
import { logger } from '@/app/lib/logger';

export interface DispatchOptions {
  channels: ChannelName[];
  incidentId?: string;
  eventType: string;
  payload: NotificationPayload;
  /** Profile IDs — required for in_app and push. */
  recipientUserIds?: string[];
  href?: string;
}

export interface DispatchResult {
  results: ChannelResult[];
  delivered: boolean;
}

/**
 * Send a notification through the requested channels and log the result.
 * Never throws.
 */
export async function dispatch(options: DispatchOptions): Promise<DispatchResult> {
  const { channels, incidentId, eventType, payload, recipientUserIds, href } = options;

  const enriched: NotificationPayload = {
    ...payload,
    recipientUserIds: recipientUserIds ?? payload.recipientUserIds,
    incidentId: incidentId ?? payload.incidentId,
    eventType: eventType ?? payload.eventType,
    href: href ?? payload.href,
  };

  const attempted = channels.filter((c) => isChannelConfigured(c));
  const skippedUnconfigured = channels.filter((c) => !isChannelConfigured(c));

  const results: ChannelResult[] = [];

  if (attempted.length === 0 && skippedUnconfigured.length > 0) {
    const result: DispatchResult = {
      results: skippedUnconfigured.map((c) => ({ channel: c, status: 'skipped_not_configured' })),
      delivered: false,
    };
    await persistLog({ incidentId, eventType, payload: enriched, results: result.results });
    return result;
  }

  const settled = await Promise.all(
    attempted.map(async (channel) => {
      try {
        return await CHANNELS[channel](enriched);
      } catch (err) {
        logger.error('notify_channel_threw', { channel, error: String(err) });
        return { channel, status: 'error' };
      }
    })
  );

  results.push(...settled);
  results.push(
    ...skippedUnconfigured.map((c) => ({ channel: c, status: 'skipped_not_configured' as const }))
  );

  const delivered = results.some((r) => r.status === 'sent');
  await persistLog({ incidentId, eventType, payload: enriched, results });
  return { results, delivered };
}

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
        recipientCount: input.payload.recipientUserIds?.length ?? 0,
      },
    });
  } catch (err) {
    logger.warn('notification_log_failed', { error: String(err) });
  }
}

/** Default staff channels — in-app always; push when VAPID configured. */
export function defaultStaffChannels(): ChannelName[] {
  return ['in_app', 'push'];
}

/** @deprecated Prefer defaultStaffChannels — SMS/email disabled for now. */
export function defaultChannelsForSeverity(_severity: string): ChannelName[] {
  return defaultStaffChannels();
}

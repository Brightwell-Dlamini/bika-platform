'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { tryGetSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { qk } from '@/app/lib/api/queryKeys';
import { logger } from '@/app/lib/logger';

/**
 * Realtime → React Query bridge for incidents, events, and notifications.
 */
export function useIncidentsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const result = tryGetSupabaseBrowserClient();
    if (!result.ok) return;

    const supabase = result.client;
    const channelName = `bika-live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let channel: RealtimeChannel | null = null;
    let isTornDown = false;

    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incidents' },
          (payload) => {
            if (isTornDown) return;
            const id =
              (payload.new as { id?: string } | null)?.id ??
              (payload.old as { id?: string } | null)?.id;

            qc.invalidateQueries({ queryKey: qk.incidents.lists() });
            qc.invalidateQueries({ queryKey: qk.users.me() });

            if (id) {
              qc.invalidateQueries({ queryKey: qk.incidents.detail(id) });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incident_events' },
          (payload) => {
            if (isTornDown) return;
            const incidentId = (payload.new as { incident_id?: string } | null)?.incident_id;
            if (incidentId) {
              qc.invalidateQueries({ queryKey: qk.incidents.detail(incidentId) });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          () => {
            if (isTornDown) return;
            qc.invalidateQueries({ queryKey: qk.notifications.all });
          }
        )
        .subscribe((status, err) => {
          if (err) {
            logger.warn('realtime_subscribe_error', {
              channelName,
              status,
              error: String(err),
            });
          }
        });
    } catch (err) {
      logger.warn('realtime_setup_failed', { error: String(err) });
      return;
    }

    return () => {
      isTornDown = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [qc]);
}

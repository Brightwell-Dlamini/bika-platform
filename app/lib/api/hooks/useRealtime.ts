'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { tryGetSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { qk } from '@/app/lib/api/queryKeys';
import { logger } from '@/app/lib/logger';

/**
 * BIKA v2 — Realtime → React Query bridge.
 *
 * Subscribes to incidents + incident_events and invalidates queries
 * whenever anything changes. TanStack Query refetches only the queries
 * that are currently mounted.
 *
 * Two important behaviors:
 *
 * 1. UNIQUE CHANNEL NAME per mount. Supabase realtime treats channels
 *    as globals keyed by name — reusing "bika-incidents-live" across
 *    two simultaneous mounts causes the "cannot add callbacks after
 *    subscribe" error. We generate a unique suffix.
 *
 * 2. SINGLE SUBSCRIBE PER MOUNT. All .on() calls happen before .subscribe().
 *    The channel is torn down on unmount via removeChannel.
 */
export function useIncidentsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const result = tryGetSupabaseBrowserClient();
    if (!result.ok) return;

    const supabase = result.client;

    // Unique channel name — prevents collisions when two components
    // mount this hook at the same time (React Strict Mode, nested layouts).
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

            // Always invalidate lists
            qc.invalidateQueries({ queryKey: qk.incidents.lists() });

            // Invalidate the specific detail if we know the id
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
      // Realtime is a nice-to-have. If it fails, the app still works.
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

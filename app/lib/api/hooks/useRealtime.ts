'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { tryGetSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { qk } from '@/app/lib/api/queryKeys';
import { logger } from '@/app/lib/logger';

/**
 * Realtime → React Query bridge.
 * Uses refetchQueries so Wall / queue / KPIs update immediately without a full page reload.
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

    const bumpIncidents = (id?: string | null) => {
      if (isTornDown) return;
      // Active queries only — instant UI refresh
      void qc.refetchQueries({ queryKey: qk.incidents.lists(), type: 'active' });
      void qc.refetchQueries({ queryKey: qk.users.me(), type: 'active' });
      if (id) {
        void qc.refetchQueries({ queryKey: qk.incidents.detail(id), type: 'active' });
      }
    };

    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incidents' },
          (payload) => {
            const id =
              (payload.new as { id?: string } | null)?.id ??
              (payload.old as { id?: string } | null)?.id;
            bumpIncidents(id);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incident_events' },
          (payload) => {
            const incidentId = (payload.new as { incident_id?: string } | null)?.incident_id;
            if (incidentId) bumpIncidents(incidentId);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          () => {
            if (isTornDown) return;
            void qc.refetchQueries({ queryKey: qk.notifications.all, type: 'active' });
          }
        )
        .subscribe((status, err) => {
          if (err) {
            logger.warn('realtime_subscribe_error', {
              channelName,
              status,
              error: String(err),
            });
          } else {
            logger.info('realtime_subscribed', { channelName, status });
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

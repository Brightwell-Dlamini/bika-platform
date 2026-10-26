'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { NotificationRow } from '@/app/api/notifications/route';

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: qk.notifications.list(),
    queryFn: () =>
      apiFetch<{ items: NotificationRow[]; unreadCount: number }>('/api/notifications?limit=40'),
    enabled,
    refetchInterval: 45_000,
    staleTime: 15_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { ids?: string[]; all?: boolean }) =>
      apiFetch('/api/notifications', { method: 'PATCH', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { Hotline } from '@/app/types';

interface UpsertHotlineInput {
  id?: string;
  name: string;
  number: string;
  category: Hotline['category'];
  description?: string | null;
  agencyCode?: Hotline['agencyCode'];
  availableHours?: string;
  isTollFree?: boolean;
  priority?: number;
  active?: boolean;
}

export function useUpsertHotline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertHotlineInput) =>
      apiFetch<{ hotline: Hotline }>('/api/admin/hotlines', {
        method: 'POST',
        body: input,
      }).then((r) => r.hotline),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.hotlines.all });
    },
  });
}

export function useDeleteHotline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/admin/hotlines/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.hotlines.all });
    },
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { User } from '@/app/types';

export interface OfficerMePayload {
  user: User;
  queue: {
    assignedToMe: number;
    unassignedInMyScope: number;
    slaOverdueMine: number;
    slaOverdueInMyScope: number;
    resolvedByMe7d: number;
  };
}

export function useOfficerMe() {
  return useQuery({
    // Must match invalidation in useIncidentActions (qk.users.me)
    queryKey: qk.users.me(),
    queryFn: () => apiFetch<OfficerMePayload>('/api/officer/me'),
    staleTime: 30_000,
  });
}

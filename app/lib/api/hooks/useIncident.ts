'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { Incident, IncidentEvent } from '@/app/types';

interface IncidentDetailResponse {
  incident: Incident;
  events: IncidentEvent[];
}

export function useIncident(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? qk.incidents.detail(id) : qk.incidents.details(),
    queryFn: () => apiFetch<IncidentDetailResponse>(`/api/reports/${id}`),
    enabled: Boolean(id),
  });
}

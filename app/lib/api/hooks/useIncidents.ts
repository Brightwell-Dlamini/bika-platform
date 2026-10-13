'use client';

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk, type IncidentFilters } from '@/app/lib/api/queryKeys';
import type { Incident } from '@/app/types';

interface IncidentsResponse {
  incidents: Incident[];
  total: number;
}

/**
 * Fetch a filtered list of incidents.
 * Scoping (region/agency) is enforced server-side by RLS + route logic.
 */
export function useIncidents(
  filters: IncidentFilters = {},
  options?: Omit<UseQueryOptions<IncidentsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: qk.incidents.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.region) params.set('region', filters.region);
      if (filters.mode) params.set('mode', filters.mode);
      if (filters.status) params.set('status', filters.status);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.agencyCode) params.set('agencyCode', filters.agencyCode);
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
      if (filters.search) params.set('search', filters.search);
      if (filters.onlyOverdue) params.set('onlyOverdue', 'true');
      if (filters.limit) params.set('limit', String(filters.limit));

      const qs = params.toString();
      return apiFetch<IncidentsResponse>(`/api/reports${qs ? `?${qs}` : ''}`);
    },
    ...options,
  });
}

/**
 * Invalidate all incident queries — call after any mutation that changes
 * incident state (submit, status change, assignment).
 */
export function useInvalidateIncidents() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.incidents.all });
}

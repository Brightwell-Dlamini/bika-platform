'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { Incident, IncidentEvent, IncidentStatus } from '@/app/types';

// -----------------------------------------------------------------------------
// Shared invalidation
// -----------------------------------------------------------------------------

function useInvalidateIncident(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.incidents.detail(id) });
    qc.invalidateQueries({ queryKey: qk.incidents.lists() });
    qc.invalidateQueries({ queryKey: qk.incidents.myReports() });
  };
}

// -----------------------------------------------------------------------------
// Transition
// -----------------------------------------------------------------------------

export function useTransitionIncident(id: string) {
  const invalidate = useInvalidateIncident(id);
  return useMutation({
    mutationFn: async (input: { to: IncidentStatus; note?: string }) =>
      apiFetch<{ incident: Incident }>(`/api/reports/${id}/transition`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

// -----------------------------------------------------------------------------
// Assign
// -----------------------------------------------------------------------------

export function useAssignIncident(id: string) {
  const invalidate = useInvalidateIncident(id);
  return useMutation({
    mutationFn: async (input: {
      officerId: string;
      agencyCode: string;
      reason?: string;
    }) =>
      apiFetch<{ incident: Incident }>(`/api/reports/${id}/assign`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

// -----------------------------------------------------------------------------
// Add note
// -----------------------------------------------------------------------------

export function useAddNote(id: string) {
  const invalidate = useInvalidateIncident(id);
  return useMutation({
    mutationFn: async (input: { body: string; isPublic: boolean }) =>
      apiFetch<{ event: IncidentEvent }>(`/api/reports/${id}/notes`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

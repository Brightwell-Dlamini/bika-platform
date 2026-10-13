'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { Incident, IncidentEvent, IncidentStatus } from '@/app/types';

function useInvalidateIncident(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.incidents.detail(id) });
    qc.invalidateQueries({ queryKey: qk.incidents.lists() });
    qc.invalidateQueries({ queryKey: qk.incidents.myReports() });
    qc.invalidateQueries({ queryKey: qk.users.me() });
  };
}

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

/** Atomic claim + in_progress — preferred over assign+transition. */
export function useAcknowledgeIncident(id: string) {
  const invalidate = useInvalidateIncident(id);
  return useMutation({
    mutationFn: async () =>
      apiFetch<{ incident: Incident }>(`/api/reports/${id}/acknowledge`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: invalidate,
  });
}

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

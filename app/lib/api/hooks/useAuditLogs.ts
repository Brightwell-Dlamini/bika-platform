'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';

export interface AuditLogRow {
  id: string;
  createdAt: string;
  userId: string | null;
  userName: string;
  userRole: string | null;
  action: string;
  targetId: string | null;
  details: string | null;
}

export function useAuditLogs(filters: { targetId?: string; action?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.audit.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.targetId) params.set('targetId', filters.targetId);
      if (filters.action) params.set('action', filters.action);
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return apiFetch<{ logs: AuditLogRow[] }>(
        `/api/admin/audit${qs ? `?${qs}` : ''}`
      ).then((r) => r.logs);
    },
    staleTime: 15_000,
  });
}

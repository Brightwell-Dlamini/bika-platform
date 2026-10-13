'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { User } from '@/app/types';

export interface UserFilters {
  role?: string;
  region?: string;
  agencyCode?: string;
  active?: boolean;
  search?: string;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: qk.users.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.role) params.set('role', filters.role);
      if (filters.region) params.set('region', filters.region);
      if (filters.agencyCode) params.set('agencyCode', filters.agencyCode);
      if (filters.active !== undefined) params.set('active', String(filters.active));
      const qs = params.toString();
      return apiFetch<{ users: User[] }>(`/api/admin/users${qs ? `?${qs}` : ''}`).then(
        (r) => r.users
      );
    },
    staleTime: 30_000,
  });
}

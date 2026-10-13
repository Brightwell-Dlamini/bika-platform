'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { User } from '@/app/types';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: User['role'];
  region: User['region'];
  agencyCode?: User['agencyCode'];
  department?: string | null;
  badgeNumber?: string | null;
  phone?: string | null;
  active?: boolean;
  onDuty?: boolean;
}

interface UpdateUserInput extends Partial<CreateUserInput> {
  id: string;
  password?: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiFetch<{ user: User }>('/api/admin/users', { method: 'POST', body: input }).then(
        (r) => r.user
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput) =>
      apiFetch<{ user: User }>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: input,
      }).then((r) => r.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ user: User }>(`/api/admin/users/${id}`, { method: 'DELETE' }).then(
        (r) => r.user
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
  });
}

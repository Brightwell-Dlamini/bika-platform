'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';

// -----------------------------------------------------------------------------
// Logos
// -----------------------------------------------------------------------------

interface UpsertLogoInput {
  id: string;
  name: string;
  subtitle?: string | null;
  acronym: string;
  role?: string | null;
  customImageUrl?: string | null;
  badgeColor?: string | null;
}

export function useUpsertLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertLogoInput) =>
      apiFetch<{ logo: unknown }>('/api/admin/system/logos', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.logos.all }),
  });
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

interface UpdateConfigInput {
  appName?: string;
  subTitle?: string;
  maxImageSizeBytes?: number;
  allowedImageFormats?: string[];
  sessionTimeoutMins?: number;
  offlineSyncEnabled?: boolean;
  whatsappGatewayUrl?: string | null;
  smsGatewayKey?: string | null;
  emailSmtpHost?: string | null;
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConfigInput) =>
      apiFetch<{ config: unknown }>('/api/admin/system/config', {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.config.all }),
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type { Agency, Hotline } from '@/app/types';

// -----------------------------------------------------------------------------
// Agencies
// -----------------------------------------------------------------------------

export function useAgencies() {
  return useQuery({
    queryKey: qk.agencies.list(),
    queryFn: () => apiFetch<{ agencies: Agency[] }>('/api/reference/agencies').then((r) => r.agencies),
    staleTime: 60 * 60_000, // 1 hour
  });
}

// -----------------------------------------------------------------------------
// Hotlines (public directory)
// -----------------------------------------------------------------------------

export function useHotlines() {
  return useQuery({
    queryKey: qk.hotlines.list(),
    queryFn: () => apiFetch<{ hotlines: Hotline[] }>('/api/reference/hotlines').then((r) => r.hotlines),
    staleTime: 5 * 60_000, // 5 min — this can change
  });
}

// -----------------------------------------------------------------------------
// Logos (branding)
// -----------------------------------------------------------------------------

export interface SystemLogo {
  id: string;
  name: string;
  subtitle: string | null;
  acronym: string;
  role: string | null;
  customImageUrl: string | null;
  badgeColor: string | null;
  updatedAt: string;
}

export function useLogos() {
  return useQuery({
    queryKey: qk.logos.list(),
    queryFn: () => apiFetch<{ logos: SystemLogo[] }>('/api/reference/logos').then((r) => r.logos),
    staleTime: 60 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// System config (public subset)
// -----------------------------------------------------------------------------

export interface PublicSystemConfig {
  appName: string;
  subTitle: string;
  maxImageSizeBytes: number;
  allowedImageFormats: string[];
}

export function useSystemConfig() {
  return useQuery({
    queryKey: qk.config.detail(),
    queryFn: () => apiFetch<PublicSystemConfig>('/api/reference/config'),
    staleTime: 60 * 60_000,
  });
}

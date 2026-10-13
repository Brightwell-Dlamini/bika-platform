'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/app/lib/api/fetcher';
import { qk } from '@/app/lib/api/queryKeys';
import type {
  AnalyticsRange,
  KpiSummary,
  RegionBreakdown,
  TrendPoint,
  SlaStats,
} from '@/app/types/analytics';

interface FilterParams {
  range?: AnalyticsRange;
  region?: string;
  mode?: string;
  agencyCode?: string;
}

function toParams(filters: FilterParams): string {
  const p = new URLSearchParams();
  if (filters.range) p.set('range', filters.range);
  if (filters.region) p.set('region', filters.region);
  if (filters.mode) p.set('mode', filters.mode);
  if (filters.agencyCode) p.set('agencyCode', filters.agencyCode);
  return p.toString();
}

export function useKpis(filters: FilterParams = {}) {
  return useQuery({
    queryKey: qk.analytics.kpis(filters.range ?? '30d'),
    queryFn: () =>
      apiFetch<KpiSummary>(`/api/analytics/kpis?${toParams(filters)}`),
    staleTime: 60_000,
  });
}

export function useRegionBreakdown(filters: FilterParams = {}) {
  return useQuery({
    queryKey: [...qk.analytics.regionSummary(filters.range ?? '30d'), 'regions'],
    queryFn: () =>
      apiFetch<{ regions: RegionBreakdown[] }>(
        `/api/analytics/regions?${toParams(filters)}`
      ).then((r) => r.regions),
    staleTime: 60_000,
  });
}

export function useTrends(params: { days?: number; region?: string; mode?: string } = {}) {
  const days = params.days ?? 30;
  return useQuery({
    queryKey: [...qk.analytics.all, 'trends', days, params.region, params.mode],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set('days', String(days));
      if (params.region) p.set('region', params.region);
      if (params.mode) p.set('mode', params.mode);
      return apiFetch<{ trends: TrendPoint[] }>(`/api/analytics/trends?${p}`).then(
        (r) => r.trends
      );
    },
    staleTime: 60_000,
  });
}

export function useSlaStats() {
  return useQuery({
    queryKey: qk.analytics.slaBreach(),
    queryFn: () => apiFetch<SlaStats>('/api/analytics/sla'),
    staleTime: 30_000,
  });
}

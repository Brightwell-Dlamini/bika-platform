/**
 * BIKA v2 — TanStack Query key factory.
 */

import type { IncidentStatus, Severity, Region, Mode } from '@/app/types';

export interface IncidentFilters {
  region?: Region;
  mode?: Mode;
  status?: IncidentStatus;
  severity?: Severity;
  agencyCode?: string;
  assignedTo?: string;
  search?: string;
  onlyOverdue?: boolean;
  onlyUnassigned?: boolean;
  limit?: number;
}

export const qk = {
  incidents: {
    all: ['incidents'] as const,
    lists: () => [...qk.incidents.all, 'list'] as const,
    list: (filters: IncidentFilters) => [...qk.incidents.lists(), filters] as const,
    details: () => [...qk.incidents.all, 'detail'] as const,
    detail: (id: string) => [...qk.incidents.details(), id] as const,
    events: (id: string) => [...qk.incidents.detail(id), 'events'] as const,
    myReports: () => [...qk.incidents.all, 'my-reports'] as const,
  },

  agencies: {
    all: ['agencies'] as const,
    list: () => [...qk.agencies.all, 'list'] as const,
    detail: (code: string) => [...qk.agencies.all, code] as const,
  },
  hotlines: {
    all: ['hotlines'] as const,
    list: () => [...qk.hotlines.all, 'list'] as const,
  },
  logos: {
    all: ['logos'] as const,
    list: () => [...qk.logos.all, 'list'] as const,
  },
  config: {
    all: ['config'] as const,
    detail: () => [...qk.config.all, 'default'] as const,
  },

  users: {
    all: ['users'] as const,
    lists: () => [...qk.users.all, 'list'] as const,
    list: (filters?: { role?: string; region?: string; agencyCode?: string; active?: boolean }) =>
      [...qk.users.lists(), filters ?? {}] as const,
    detail: (id: string) => [...qk.users.all, id] as const,
    me: () => [...qk.users.all, 'me'] as const,
  },

  fleet: {
    all: ['fleet'] as const,
    lists: () => [...qk.fleet.all, 'list'] as const,
    list: (filters?: { region?: Region; permitStatus?: string; search?: string }) =>
      [...qk.fleet.lists(), filters ?? {}] as const,
    detail: (id: string) => [...qk.fleet.all, id] as const,
  },

  establishments: {
    all: ['establishments'] as const,
    lists: () => [...qk.establishments.all, 'list'] as const,
    list: (filters?: { region?: Region; healthStatus?: string; search?: string }) =>
      [...qk.establishments.lists(), filters ?? {}] as const,
    detail: (id: string) => [...qk.establishments.all, id] as const,
  },

  analytics: {
    all: ['analytics'] as const,
    kpis: (range: string) => [...qk.analytics.all, 'kpis', range] as const,
    regionSummary: (range: string) =>
      [...qk.analytics.all, 'region-summary', range] as const,
    slaBreach: () => [...qk.analytics.all, 'sla-breach'] as const,
  },

  audit: {
    all: ['audit'] as const,
    list: (filters?: { userId?: string; targetId?: string; limit?: number }) =>
      [...qk.audit.all, filters ?? {}] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: () => [...qk.notifications.all, 'list'] as const,
  },
} as const;

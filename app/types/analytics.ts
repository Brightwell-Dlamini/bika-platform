/**
 * BIKA v2 — Analytics response types.
 *
 * These describe the shape of data returned by /api/analytics/*.
 * They're computed server-side using Postgres aggregates — the client
 * never iterates raw incidents to build these.
 */

import type { Mode, Region, Severity, IncidentStatus, ReportType } from './index';

export interface KpiSummary {
  range: AnalyticsRange;
  total: number;
  open: number;
  critical: number;
  slaOverdue: number;
  resolved: number;
  resolutionRate: number; // 0-100
  avgFirstResponseMins: number | null;
  avgResolutionMins: number | null;
  compliments: number;
  emergencies: number;
}

export interface RegionBreakdown {
  region: Region;
  total: number;
  open: number;
  critical: number;
  slaOverdue: number;
  resolved: number;
  avgAckMins: number | null;
  avgResolveMins: number | null;
  resolutionRate: number;
}

export interface StatusBreakdown {
  status: IncidentStatus;
  count: number;
}

export interface SeverityBreakdown {
  severity: Severity;
  count: number;
}

export interface ModeBreakdown {
  mode: Mode;
  count: number;
}

export interface TypeBreakdown {
  reportType: ReportType;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  submitted: number;
  resolved: number;
  slaBreaches: number;
}

export interface SlaStats {
  totalOpen: number;
  overdue: number;
  dueIn1h: number;
  dueIn4h: number;
  dueToday: number;
  overdueBySeverity: Record<Severity, number>;
}

export type AnalyticsRange = '24h' | '7d' | '30d' | '90d' | 'year' | 'all';

export const ANALYTICS_RANGES: Array<{ key: AnalyticsRange; label: string }> = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

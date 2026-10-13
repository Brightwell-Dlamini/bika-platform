import type { Severity, Incident } from '@/app/types';

/**
 * BIKA v2 — SLA computation.
 *
 * Rules (in hours to first response):
 *   CRITICAL → 2h
 *   HIGH     → 8h
 *   MEDIUM   → 24h
 *   LOW      → 72h
 *
 * This mirrors the trigger in sql/000_reset.sql. If you change one,
 * change both. (Or better: read from system_config in a future refactor.)
 */

export const SLA_HOURS: Record<Severity, number> = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

/** Compute the SLA deadline from a severity + creation time. */
export function computeSlaDueAt(severity: Severity, from: Date = new Date()): Date {
  const hours = SLA_HOURS[severity] ?? 24;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/** True if the case is past SLA and still actionable. */
export function isSlaBreached(incident: Pick<Incident, 'slaDueAt' | 'status'>): boolean {
  if (!incident.slaDueAt) return false;
  if (['resolved', 'closed', 'rejected'].includes(incident.status)) return false;
  return Date.now() > new Date(incident.slaDueAt).getTime();
}

/** Minutes remaining (positive) or overdue (negative). */
export function minutesUntilSla(incident: Pick<Incident, 'slaDueAt'>): number | null {
  if (!incident.slaDueAt) return null;
  return (new Date(incident.slaDueAt).getTime() - Date.now()) / 60_000;
}

/**
 * SLA severity tiers for dashboards / heatmaps.
 * Returns a semantic string for styling.
 */
export type SlaStatus = 'ok' | 'warning' | 'urgent' | 'breached' | 'done';

export function slaStatus(
  incident: Pick<Incident, 'slaDueAt' | 'status'>
): SlaStatus {
  if (['resolved', 'closed', 'rejected'].includes(incident.status)) return 'done';
  const mins = minutesUntilSla(incident);
  if (mins === null) return 'ok';
  if (mins < 0) return 'breached';
  if (mins < 60) return 'urgent';
  if (mins < 240) return 'warning';
  return 'ok';
}

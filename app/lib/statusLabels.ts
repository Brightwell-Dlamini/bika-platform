import type { IncidentStatus } from '@/app/types';

/** Human-readable labels for citizen and officer surfaces. */
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: 'Submitted',
  triaged: 'Under review',
  assigned: 'Assigned to officer',
  in_progress: 'In progress',
  awaiting_info: 'Awaiting information',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Not accepted',
};

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  submitted: 'bg-slate-700 text-slate-200',
  triaged: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  assigned: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  awaiting_info: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  escalated: 'bg-red-500/20 text-red-300 border border-red-500/40',
  resolved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  closed: 'bg-slate-700 text-slate-300',
  rejected: 'bg-red-900/40 text-red-300 border border-red-800/60',
};

export function statusLabel(status: IncidentStatus | string): string {
  return STATUS_LABELS[status as IncidentStatus] ?? String(status).replace(/_/g, ' ');
}

export function statusColor(status: IncidentStatus | string): string {
  return STATUS_COLORS[status as IncidentStatus] ?? 'bg-slate-700 text-slate-200';
}

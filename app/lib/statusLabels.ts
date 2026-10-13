import type { IncidentStatus } from '@/app/types';

/** Human-readable labels for citizen and officer surfaces. */
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: 'Submitted',
  triaged: 'Triaged',
  assigned: 'Assigned',
  in_progress: 'In progress',
  awaiting_info: 'Awaiting information',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

export function statusLabel(status: IncidentStatus | string): string {
  return STATUS_LABELS[status as IncidentStatus] ?? String(status).replace(/_/g, ' ');
}

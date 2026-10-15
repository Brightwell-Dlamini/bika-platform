/**
 * Single source of truth for incident status transitions.
 * Used by API routes and officer UI so hints match server rules.
 */

import type { IncidentStatus } from '@/app/types';

export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  submitted: ['triaged', 'assigned', 'in_progress', 'rejected', 'escalated'],
  triaged: ['assigned', 'in_progress', 'awaiting_info', 'rejected', 'escalated'],
  assigned: ['in_progress', 'awaiting_info', 'resolved', 'escalated', 'triaged'],
  in_progress: ['resolved', 'awaiting_info', 'escalated', 'closed'],
  awaiting_info: ['in_progress', 'resolved', 'rejected'],
  escalated: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
  rejected: [],
};

/** Primary next steps shown as buttons (subset of ALLOWED). */
export const PRIMARY_NEXT: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
  submitted: ['triaged', 'assigned', 'rejected'],
  triaged: ['assigned', 'in_progress', 'awaiting_info', 'rejected'],
  assigned: ['in_progress', 'awaiting_info', 'resolved'],
  in_progress: ['resolved', 'awaiting_info'],
  awaiting_info: ['in_progress', 'resolved', 'rejected'],
  escalated: ['in_progress', 'resolved'],
  resolved: ['closed'],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function canAcknowledge(status: IncidentStatus): boolean {
  return status === 'submitted' || status === 'triaged' || status === 'assigned';
}

export const CITIZEN_NOTIFY_STATUSES: IncidentStatus[] = [
  'triaged',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'escalated',
];

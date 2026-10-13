import type { Incident } from '@/app/types';

/**
 * BIKA v2 — Message templates.
 *
 * All user-facing notification text lives here. Never build a message
 * with string concatenation at the call site — use a template.
 */

export interface RenderedMessage {
  subject: string;
  body: string;
}

// -----------------------------------------------------------------------------
// Citizen-facing
// -----------------------------------------------------------------------------

export function citizenReceipt(incident: Incident): RenderedMessage {
  return {
    subject: `BIKA receipt — ${incident.id}`,
    body:
      `BIKA has received your report.\n\n` +
      `Reference: ${incident.id}\n` +
      `Category: ${incident.category}\n` +
      `Location: ${incident.location}\n` +
      `Severity: ${incident.severity}\n\n` +
      `Track this report at any time using your reference number.\n` +
      `In an emergency, call 999 immediately.`,
  };
}

export function citizenStatusChange(
  incident: Incident,
  newStatus: string
): RenderedMessage {
  return {
    subject: `BIKA update — ${incident.id}`,
    body:
      `Status update for ${incident.id}:\n\n` +
      `New status: ${newStatus.replace(/_/g, ' ')}\n` +
      `Category: ${incident.category}\n` +
      `Location: ${incident.location}\n\n` +
      `Track: use your reference number on the BIKA portal.`,
  };
}

export function citizenResolved(incident: Incident): RenderedMessage {
  return {
    subject: `BIKA resolved — ${incident.id}`,
    body:
      `Your report ${incident.id} has been resolved.\n\n` +
      `Thank you for helping keep Eswatini safer.\n` +
      `You can rate the response on the BIKA portal.`,
  };
}

// -----------------------------------------------------------------------------
// Officer-facing
// -----------------------------------------------------------------------------

export function officerAssignment(incident: Incident, officerName: string): RenderedMessage {
  return {
    subject: `[BIKA ${incident.severity}] Assigned: ${incident.id}`,
    body:
      `You have been assigned case ${incident.id}.\n\n` +
      `Category: ${incident.category}\n` +
      `Location: ${incident.location}\n` +
      `Severity: ${incident.severity}\n` +
      `Region: ${incident.region}\n` +
      (incident.slaDueAt ? `SLA due: ${new Date(incident.slaDueAt).toLocaleString()}\n` : '') +
      `\nOpen the case: /officer/case/${incident.id}`,
  };
}

export function officerCritical(incident: Incident): RenderedMessage {
  return {
    subject: `[BIKA CRITICAL] ${incident.id}`,
    body:
      `CRITICAL incident requires immediate attention.\n\n` +
      `Reference: ${incident.id}\n` +
      `Category: ${incident.category}\n` +
      `Location: ${incident.location}\n` +
      `Region: ${incident.region}\n\n` +
      `Description: ${incident.description.slice(0, 200)}\n\n` +
      `Open: /officer/case/${incident.id}`,
  };
}

export function officerEscalation(
  incident: Incident,
  reason: string,
  escalatedBy: string
): RenderedMessage {
  return {
    subject: `[BIKA ESCALATED] ${incident.id}`,
    body:
      `Case ${incident.id} has been escalated.\n\n` +
      `By: ${escalatedBy}\n` +
      `Reason: ${reason}\n\n` +
      `Reference: ${incident.id}\n` +
      `Severity: ${incident.severity}\n` +
      `Region: ${incident.region}`,
  };
}

export function slaBreachAlert(incident: Incident, overdueMins: number): RenderedMessage {
  return {
    subject: `[BIKA SLA BREACH] ${incident.id}`,
    body:
      `SLA overdue for case ${incident.id}.\n\n` +
      `Overdue by: ${Math.round(overdueMins)} minutes\n` +
      `Severity: ${incident.severity}\n` +
      `Location: ${incident.location}\n` +
      `Assigned: ${incident.assignedOfficerName ?? 'Unassigned'}\n\n` +
      `Action required immediately.`,
  };
}

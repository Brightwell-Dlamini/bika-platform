import type { Incident } from '@/app/types';

/**
 * BIKA v2 — Message templates.
 * All user-facing notification text lives here.
 */

export interface RenderedMessage {
  subject: string;
  body: string;
}

// -----------------------------------------------------------------------------
// Citizen-facing (legacy SMS/email — not used for bell)
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

export function citizenStatusChange(incident: Incident, newStatus: string): RenderedMessage {
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
// Officer-facing (in-app + push)
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
      `\nOpen: /officer/case/${incident.id}`,
  };
}

export function officerUnassigned(
  incident: Incident,
  newOfficerName: string | null
): RenderedMessage {
  return {
    subject: `[BIKA] Reassigned away: ${incident.id}`,
    body:
      `Case ${incident.id} is no longer assigned to you.\n\n` +
      (newOfficerName ? `Now with: ${newOfficerName}\n` : '') +
      `Category: ${incident.category}\n` +
      `Location: ${incident.location}`,
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

export function officerNewInQueue(incident: Incident): RenderedMessage {
  return {
    subject: `[BIKA ${incident.severity}] New case: ${incident.id}`,
    body:
      `A new case is waiting in your agency queue.\n\n` +
      `Reference: ${incident.id}\n` +
      `Category: ${incident.category}\n` +
      `Location: ${incident.location}\n` +
      `Region: ${incident.region}\n` +
      `Severity: ${incident.severity}\n\n` +
      `Open: /officer/case/${incident.id}`,
  };
}

export function officerStatusChange(
  incident: Incident,
  fromStatus: string,
  toStatus: string,
  byName: string
): RenderedMessage {
  return {
    subject: `[BIKA] ${incident.id} → ${toStatus.replace(/_/g, ' ')}`,
    body:
      `Case ${incident.id} status changed.\n\n` +
      `From: ${fromStatus.replace(/_/g, ' ')}\n` +
      `To: ${toStatus.replace(/_/g, ' ')}\n` +
      `By: ${byName}\n` +
      `Location: ${incident.location}\n\n` +
      `Open: /officer/case/${incident.id}`,
  };
}

export function officerNoteAdded(
  incident: Incident,
  byName: string,
  isPublic: boolean,
  preview: string
): RenderedMessage {
  return {
    subject: `[BIKA] Note on ${incident.id}`,
    body:
      `${byName} added a ${isPublic ? 'public' : 'internal'} note on ${incident.id}.\n\n` +
      `${preview.slice(0, 240)}${preview.length > 240 ? '…' : ''}\n\n` +
      `Open: /officer/case/${incident.id}`,
  };
}

export function officerCitizenRating(
  incident: Incident,
  score: number,
  comment?: string | null
): RenderedMessage {
  const stars = '★'.repeat(score) + '☆'.repeat(5 - score);
  return {
    subject: `[BIKA] Citizen rated ${incident.id}: ${score}/5`,
    body:
      `A citizen rated case ${incident.id}.\n\n` +
      `Score: ${stars} (${score}/5)\n` +
      (comment ? `Comment: ${comment.slice(0, 200)}\n` : '') +
      `Location: ${incident.location}\n\n` +
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
      `Region: ${incident.region}\n\n` +
      `Open: /officer/case/${incident.id}`,
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
      `Action required immediately.\n` +
      `Open: /officer/case/${incident.id}`,
  };
}

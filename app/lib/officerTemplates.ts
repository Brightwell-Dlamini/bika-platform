/**
 * Officer reply templates — quick chips for case notes.
 * Keep short, professional, and suitable for public-facing notes.
 */

export interface OfficerTemplate {
  id: string;
  label: string;
  body: string;
  /** Prefer public visibility when inserted */
  preferPublic?: boolean;
}

export const OFFICER_TEMPLATES: OfficerTemplate[] = [
  {
    id: 'ack',
    label: 'Acknowledge',
    body: 'We have received your report and assigned it for review. You will be updated as the case progresses.',
    preferPublic: true,
  },
  {
    id: 'info',
    label: 'Need more info',
    body: 'Please provide additional details if possible (exact time, vehicle registration, or clearer location). Reply via this reference ID or contact the responding unit.',
    preferPublic: true,
  },
  {
    id: 'on_scene',
    label: 'On scene',
    body: 'An officer is attending to this matter. Thank you for reporting.',
    preferPublic: true,
  },
  {
    id: 'resolved',
    label: 'Resolved',
    body: 'This case has been resolved. If the issue continues, please submit a new report with this reference for linkage.',
    preferPublic: true,
  },
  {
    id: 'escalate',
    label: 'Escalated',
    body: 'This matter has been escalated to supervisory channels for further action.',
    preferPublic: true,
  },
  {
    id: 'internal_handoff',
    label: 'Internal handoff',
    body: 'Handed over to the appropriate agency unit for follow-up. Monitor SLA.',
    preferPublic: false,
  },
];

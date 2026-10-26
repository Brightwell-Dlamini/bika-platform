/** Client-safe notification types (do not import from route handlers). */

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  href: string | null;
  incidentId: string | null;
  eventType: string;
  readAt: string | null;
  createdAt: string;
}

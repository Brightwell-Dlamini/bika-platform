/**
 * BIKA v2 — Core domain types.
 *
 * Rules:
 * - Every type is a discriminated union or a strict shape.
 * - No `any`, no optional-by-default. Optional means truly optional.
 * - Types are the single source of truth for the client; server derives from Zod.
 */

// ============================================================================
// Enums (mirror Postgres enums exactly — keep in sync with sql/000_reset.sql)
// ============================================================================

export const REGIONS = ['Hhohho', 'Manzini', 'Shiselweni', 'Lubombo'] as const;
export type Region = (typeof REGIONS)[number];

export const MODES = ['Road Transport', 'Restaurant/Food'] as const;
export type Mode = (typeof MODES)[number];

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * Nine statuses. Lifecycle in canonical order.
 * See docs/LIFECYCLE.md for allowed transitions.
 */
export const INCIDENT_STATUSES = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'awaiting_info',
  'escalated',
  'resolved',
  'closed',
  'rejected',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const REPORT_TYPES = [
  'incident',
  'complaint',
  'compliment',
  'rating',
  'emergency',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const USER_ROLES = [
  'super_admin',
  'admin',
  'police',
  'health_inspector',
  'rank_marshal',
  'public',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Two clear permission boundaries:
 *
 *   canRunSystem(role)  → user/admin/config/branding/backup — Super Admin only
 *   canRunWork(role)    → assign/escalate/close/merge/bulk  — Admin + Super Admin
 *   canDoWork(role)     → claim/update/resolve own cases    — Officers
 *
 * Never inline `role === 'super_admin'` checks in components — use these helpers.
 */
export function canRunSystem(role: UserRole): boolean {
  return role === 'super_admin';
}

export function canRunWork(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canDoFieldWork(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'police'
      || role === 'health_inspector' || role === 'rank_marshal';
}

export function isCitizen(role: UserRole): boolean {
  return role === 'public';
}
export const AGENCY_CODES = [
  'REPS',       // Royal Eswatini Police Service
  'MOH',        // Ministry of Health
  'NRTC',       // National Road Transport Council
  'NFES',       // National Fire & Emergency Services
  'MPWT',       // Ministry of Public Works & Transport
  'ACC',        // Anti-Corruption Commission
  'BIKA',       // Central BIKA desk
] as const;
export type AgencyCode = (typeof AGENCY_CODES)[number];

// ============================================================================
// Core entities
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface Agency {
  code: AgencyCode;
  name: string;
  shortName: string;
  region: Region | 'Nationwide';
  contactPhone: string;
  contactEmail: string;
  active: boolean;
}

export interface User {
  id: string;
  authUserId: string | null;
  name: string;
  email: string;
  role: UserRole;
  region: Region | 'Nationwide';
  agencyCode: AgencyCode | null;
  department: string | null;
  badgeNumber: string | null;
  phone: string | null;
  active: boolean;
  onDuty: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The canonical incident shape returned by the API.
 * Note: `events` is NOT embedded — fetch separately to keep payloads small.
 */
export interface Incident {
  id: string;
  reportType: ReportType;
  category: string;
  mode: Mode;
  region: Region;
  location: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;

  // Reporter (PII — never exposed to public track endpoint)
  reporterName: string | null;
  reporterPhone: string | null;
  reporterEmail: string | null;
  isAnonymous: boolean;

  // Entity links
  vehicleRegistration: string | null;
  fleetId: string | null;
  establishmentId: string | null;
  operatorName: string | null;
  driverName: string | null;
  establishmentName: string | null;

  // Assignment
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedAgencyCode: AgencyCode | null;
  assignedAt: string | null;

  // Coordinates
  coordinates: Coordinates | null;

  // Timing
  createdAt: string;
  updatedAt: string;
  triagedAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  slaDueAt: string | null;

  // Meta
  isRepeatedAlert: boolean;
  escalatedCount: number;
  duplicateOfId: string | null;

  // Attachments (small — embedded OK)
  attachments: Attachment[];

  // Citizen satisfaction
  citizenRating: {
    score: number;
    comment: string | null;
    ratedAt: string;
  } | null;
}

/**
 * Append-only event log. Every state transition produces one.
 */
export const INCIDENT_EVENT_TYPES = [
  'incident.submitted',
  'incident.triaged',
  'incident.assigned',
  'incident.status_changed',
  'incident.note_added',
  'incident.message_sent',
  'incident.escalated',
  'incident.resolved',
  'incident.closed',
  'incident.rated',
  'incident.attachment_added',
  'incident.duplicate_linked',
] as const;
export type IncidentEventType = (typeof INCIDENT_EVENT_TYPES)[number];

export interface IncidentEvent {
  id: string;
  incidentId: string;
  type: IncidentEventType;
  actorId: string | null;
  actorName: string;
  actorRole: UserRole | 'system';
  /** Citizen-visible? Internal notes are hidden from public track. */
  isPublic: boolean;
  /** Type-specific data. See lib/schemas.ts for per-type validation. */
  payload: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// Fleet & Establishments (unchanged shape, tightened types)
// ============================================================================

export interface VehicleFleet {
  id: string;
  registrationNumber: string;
  fleetId: string;
  vic: string | null;
  vehicleType: string;
  operatorName: string;
  driverName: string | null;
  route: string | null;
  region: Region;
  rank: string | null;
  permitStatus: 'valid' | 'expired' | 'pending';
  permitExpiry: string | null;
  complaintsCount: number;
  complimentsCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Establishment {
  id: string;
  name: string;
  tradingName: string | null;
  referenceNumber: string | null;
  category: 'restaurant' | 'market' | 'food_vendor' | 'trade_hub';
  ownerOperator: string | null;
  location: string;
  region: Region;
  contactPhone: string | null;
  healthStatus: 'compliant' | 'warning' | 'violation' | 'pending';
  lastInspectionDate: string | null;
  rating: number;
  complaintsCount: number;
  complimentsCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Hotlines & System
// ============================================================================

export interface Hotline {
  id: string;
  name: string;
  number: string;
  category: 'emergency' | 'police' | 'fire' | 'medical' | 'transport' | 'anti_corruption' | 'general';
  description: string | null;
  agencyCode: AgencyCode;
  availableHours: string;
  isTollFree: boolean;
  priority: number;
  active: boolean;
}

// ============================================================================
// API envelope types
// ============================================================================

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// Utility types
// ============================================================================

/** Narrow an incident to one that has a status requiring officer action. */
export type ActiveIncident = Incident & {
  status: Extract<IncidentStatus, 'submitted' | 'triaged' | 'assigned' | 'in_progress' | 'awaiting_info' | 'escalated'>;
};

/** Severity ordering helper — lower index = more severe. */
export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function isTerminal(status: IncidentStatus): boolean {
  return status === 'closed' || status === 'rejected';
}

export function isActive(status: IncidentStatus): boolean {
  return !isTerminal(status) && status !== 'resolved';
}

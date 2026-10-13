/**
 * BIKA v2 — Role-Based Access Control.
 *
 * Three-tier model:
 *   super_admin → runs the SYSTEM (users, agencies, config, branding, backup)
 *   admin       → runs the WORK  (assign, escalate, close, merge, bulk ops)
 *   officer     → does the work  (claim, update, resolve own cases)
 *   public      → submits and tracks
 *
 * NEVER inline `role === 'super_admin'` in a component or API route.
 * Always call a helper from this file. If a helper is missing, add it here.
 */

import type { UserRole, AgencyCode } from '@/app/types';

// -----------------------------------------------------------------------------
// Tier checks
// -----------------------------------------------------------------------------

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin';
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isOfficer(role: UserRole): boolean {
  return role === 'police' || role === 'health_inspector' || role === 'rank_marshal';
}

export function isPublic(role: UserRole): boolean {
  return role === 'public';
}

export function isStaff(role: UserRole): boolean {
  return !isPublic(role);
}

// -----------------------------------------------------------------------------
// Capability checks — named after the three tiers
// -----------------------------------------------------------------------------

/** System owner: users, agencies, config, branding, backup. */
export function canRunSystem(role: UserRole): boolean {
  return isSuperAdmin(role);
}

/** Operations manager: assign, escalate, close, merge, bulk, cross-agency. */
export function canRunWork(role: UserRole): boolean {
  return isSuperAdmin(role) || isAdmin(role);
}

/** Field worker: claim, update own cases, resolve own cases. */
export function canDoFieldWork(role: UserRole): boolean {
  return canRunWork(role) || isOfficer(role);
}

// -----------------------------------------------------------------------------
// Feature-level checks
// -----------------------------------------------------------------------------

export function canManageUsers(role: UserRole): boolean {
  return canRunSystem(role);
}

export function canManageAgencies(role: UserRole): boolean {
  return canRunSystem(role);
}

export function canManageHotlines(role: UserRole): boolean {
  return canRunSystem(role);
}

export function canManageBranding(role: UserRole): boolean {
  return canRunSystem(role);
}

export function canManageSystemConfig(role: UserRole): boolean {
  return canRunSystem(role);
}

export function canBackupRestore(role: UserRole): boolean {
  return canRunSystem(role);
}

/** Reassign any case, regardless of who owns it. */
export function canReassignAnyCase(role: UserRole): boolean {
  return canRunWork(role);
}

/** Force-close, override SLA, override category/severity. */
export function canOverrideCase(role: UserRole): boolean {
  return canRunWork(role);
}

/** Escalate to another agency. */
export function canEscalateToAgency(role: UserRole): boolean {
  return canRunWork(role);
}

/** Link duplicates / merge incidents. */
export function canMergeIncidents(role: UserRole): boolean {
  return canRunWork(role);
}

/** Bulk operations: mass-assign, mass-close. */
export function canBulkOperate(role: UserRole): boolean {
  return canRunWork(role);
}

/** Command Centre analytics. Officers see only their own dashboard. */
export function canViewCommandCentre(role: UserRole): boolean {
  return canRunWork(role);
}

/** Full audit logs. Admins see own agency; Super Admin sees all. */
export function canViewAuditLogs(role: UserRole): boolean {
  return canRunWork(role);
}

/** Fleet CRUD. Officers get read-only. */
export function canEditFleet(role: UserRole): boolean {
  return canDoFieldWork(role);
}

/** Establishment CRUD. */
export function canEditEstablishments(role: UserRole): boolean {
  return canDoFieldWork(role);
}

/** Publish crisis banner / public notice. */
export function canPublishPublicNotice(role: UserRole): boolean {
  return canRunWork(role);
}

// -----------------------------------------------------------------------------
// Scoping helpers — for query filters, not permissions
// -----------------------------------------------------------------------------

export interface ScopeFilter {
  /** If set, restrict to this agency. */
  agencyCode?: AgencyCode;
  /** If set, restrict to this region. */
  region?: string;
  /** If true, only cases assigned to this user. */
  onlyMine?: boolean;
  /** The current user's id (used when onlyMine is true). */
  userId?: string;
}

/**
 * Default scope for a role viewing the incident queue.
 * This is a *default filter*, not a security boundary — RLS enforces the real
 * security. Officers get scoped views; Admins get nationwide with their agency
 * pre-selected; Super Admin gets everything.
 */
export function defaultScopeFor(role: UserRole, user: {
  id: string;
  region: string;
  agencyCode: AgencyCode | null;
}): ScopeFilter {
  if (isSuperAdmin(role)) {
    return {};
  }
  if (isAdmin(role)) {
    return {
      agencyCode: user.agencyCode ?? undefined,
    };
  }
  if (isOfficer(role)) {
    return {
      agencyCode: user.agencyCode ?? undefined,
      region: user.region === 'Nationwide' ? undefined : user.region,
    };
  }
  return { onlyMine: true, userId: user.id };
}

// -----------------------------------------------------------------------------
// UI labels
// -----------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  police: 'Police Officer',
  health_inspector: 'Health Inspector',
  rank_marshal: 'Rank Marshal',
  public: 'Public Citizen',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'System owner. Manages users, agencies, config, branding, backups.',
  admin: 'Operations manager. Assigns, escalates, closes cases. Nationwide.',
  police: 'Field officer. Claims and resolves transport incidents.',
  health_inspector: 'Field officer. Inspects food & trade establishments.',
  rank_marshal: 'Field officer. Manages ranks and operator compliance.',
  public: 'Citizen. Submits reports and tracks progress.',
};

export const TIER_LABELS = {
  super_admin: 'System',
  admin: 'Operations',
  officer: 'Field',
  public: 'Citizen',
} as const;

export function tierFor(role: UserRole): keyof typeof TIER_LABELS {
  if (isSuperAdmin(role)) return 'super_admin';
  if (isAdmin(role)) return 'admin';
  if (isOfficer(role)) return 'officer';
  return 'public';
}

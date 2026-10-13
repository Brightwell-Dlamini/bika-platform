/**
 * BIKA v2 — Zod schemas mirroring the Postgres schema exactly.
 *
 * Rule: if the DB accepts it, the schema accepts it. If the DB rejects it,
 * the schema rejects it *before* we ever hit the database.
 *
 * These schemas are the ONLY place validation logic lives. Forms, API routes,
 * and RPC payloads all reference these.
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Enums — MUST match sql/000_reset.sql exactly
// -----------------------------------------------------------------------------

export const zRegion = z.enum(['Hhohho', 'Manzini', 'Shiselweni', 'Lubombo']);
export const zMode = z.enum(['Road Transport', 'Restaurant/Food']);
export const zSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const zReportType = z.enum([
  'incident',
  'complaint',
  'compliment',
  'rating',
  'emergency',
]);
export const zIncidentStatus = z.enum([
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'awaiting_info',
  'escalated',
  'resolved',
  'closed',
  'rejected',
]);
export const zUserRole = z.enum([
  'super_admin',
  'admin',
  'police',
  'health_inspector',
  'rank_marshal',
  'public',
]);
export const zAgencyCode = z.enum([
  'REPS',
  'MOH',
  'NRTC',
  'NFES',
  'MPWT',
  'ACC',
  'BIKA',
]);
export const zIncidentEventType = z.enum([
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
]);

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

export const zCoordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const zAttachment = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
});

export const zPhoneEswatini = z
  .string()
  .regex(
    /^(\+?268|0)?[267]\d{7}$/,
    'Enter a valid Eswatini phone (e.g. +268 7611 2233 or 076112233)'
  );

export const zEmail = z.string().email().max(320).toLowerCase();

// -----------------------------------------------------------------------------
// Citizen submission — the /api/reports POST body
// -----------------------------------------------------------------------------

export const zCitizenReportSubmission = z
  .object({
    reportType: zReportType,
    mode: zMode,
    region: zRegion,
    category: z.string().min(2).max(120),
    location: z.string().min(3).max(200),
    description: z.string().min(10).max(4000),

    severity: zSeverity.default('MEDIUM'),

    // Optional reporter info
    reporterName: z.string().max(120).optional().nullable(),
    reporterPhone: zPhoneEswatini.optional().nullable(),
    reporterEmail: zEmail.optional().nullable(),
    isAnonymous: z.boolean().default(false),

    // Road transport specific
    vehicleRegistration: z.string().max(20).optional().nullable(),
    operatorName: z.string().max(120).optional().nullable(),
    driverName: z.string().max(120).optional().nullable(),

    // Food/trade specific
    establishmentName: z.string().max(200).optional().nullable(),

    coordinates: zCoordinates.optional().nullable(),

    attachments: z.array(zAttachment).max(5).default([]),
  })
  .refine(
    (data) => data.isAnonymous || Boolean(data.reporterPhone || data.reporterEmail),
    {
      message: 'Provide a phone or email, or submit anonymously.',
      path: ['reporterPhone'],
    }
  )
  .refine(
    (data) => data.reportType === 'emergency' ? data.severity === 'CRITICAL' : true,
    {
      message: 'Emergency reports must have CRITICAL severity.',
      path: ['severity'],
    }
  );

export type CitizenReportSubmission = z.infer<typeof zCitizenReportSubmission>;

// -----------------------------------------------------------------------------
// Officer/admin actions
// -----------------------------------------------------------------------------

export const zStatusTransition = z.object({
  to: zIncidentStatus,
  note: z.string().max(2000).optional(),
});

export const zClaimCase = z.object({
  incidentId: z.string().min(1),
});

export const zAssignCase = z.object({
  incidentId: z.string().min(1),
  officerId: z.string().min(1),
  agencyCode: zAgencyCode,
  reason: z.string().max(500).optional(),
});

export const zEscalateCase = z.object({
  incidentId: z.string().min(1),
  reason: z.string().min(10).max(2000),
  targetAgencyCode: zAgencyCode.optional(),
});

export const zAddNote = z.object({
  incidentId: z.string().min(1),
  body: z.string().min(1).max(4000),
  isPublic: z.boolean().default(false),
});

export const zCitizenRating = z.object({
  incidentId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const zLinkDuplicate = z.object({
  incidentId: z.string().min(1),
  duplicateOfId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

// -----------------------------------------------------------------------------
// Admin — user management
// -----------------------------------------------------------------------------

export const zCreateUser = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  email: zEmail,
  password: z.string().min(8).max(72), // Supabase Auth max is 72
  role: zUserRole,
  region: z.union([zRegion, z.literal('Nationwide')]),
  agencyCode: zAgencyCode.optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  badgeNumber: z.string().max(50).optional().nullable(),
  phone: zPhoneEswatini.optional().nullable(),
  active: z.boolean().default(true),
  onDuty: z.boolean().default(true),
});

export const zUpdateUser = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  email: zEmail.optional(),
  password: z.string().min(8).max(72).optional(),
  role: zUserRole.optional(),
  region: z.union([zRegion, z.literal('Nationwide')]).optional(),
  agencyCode: zAgencyCode.optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  badgeNumber: z.string().max(50).optional().nullable(),
  phone: zPhoneEswatini.optional().nullable(),
  active: z.boolean().optional(),
  onDuty: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Admin — hotlines, logos, config
// -----------------------------------------------------------------------------

export const zUpsertHotline = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  number: z.string().min(2).max(50),
  category: z.enum([
    'emergency',
    'police',
    'fire',
    'medical',
    'transport',
    'anti_corruption',
    'general',
  ]),
  description: z.string().max(500).optional().nullable(),
  agencyCode: zAgencyCode.optional().nullable(),
  availableHours: z.string().max(100).default('24/7'),
  isTollFree: z.boolean().default(false),
  priority: z.number().int().min(1).max(100).default(10),
  active: z.boolean().default(true),
});

export const zUpsertLogo = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  acronym: z.string().min(2).max(10),
  role: z.string().max(200).optional().nullable(),
  customImageUrl: z.string().url().optional().nullable(),
  badgeColor: z.string().max(200).optional().nullable(),
});

// -----------------------------------------------------------------------------
// USSD
// -----------------------------------------------------------------------------

export const zUssdPayload = z.object({
  sessionId: z.string().min(1).max(100),
  phoneNumber: zPhoneEswatini,
  serviceCode: z.string().max(50),
  text: z.string().max(500).default(''),
});

// -----------------------------------------------------------------------------
// Utility: parse and throw on failure (for API routes)
// -----------------------------------------------------------------------------

export class ValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function parseOrThrow<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  label: string
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      'VALIDATION_FAILED',
      `${label}: ${result.error.issues.map((i) => i.message).join('; ')}`,
      result.error.flatten()
    );
  }
  return result.data;
}

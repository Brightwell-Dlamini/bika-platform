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
  name: z.string().min(1).max(200),
  url: z.string().url().or(z.string().startsWith('data:')),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().nonnegative().optional(),
});

const zPhoneEswatini = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+0-9\s()-]+$/, 'Invalid phone number');

const zEmail = z.string().trim().email().max(200);

// -----------------------------------------------------------------------------
// Citizen report
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

    /** Honeypot — bots fill this; humans never see it. Must be empty. */
    website: z.string().max(0).optional().nullable(),

    /** Client form open timestamp (ms). Used to reject instant bot posts. */
    formOpenedAt: z.number().int().positive().optional().nullable(),

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
    (data) => !data.isAnonymous || data.description.trim().length >= 25,
    {
      message: 'Anonymous reports need a clearer description (at least 25 characters).',
      path: ['description'],
    }
  )
  .refine(
    (data) => !data.website,
    {
      message: 'Rejected.',
      path: ['website'],
    }
  )
  .refine(
    (data) => (data.reportType === 'emergency' ? data.severity === 'CRITICAL' : true),
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
  note: z.string().max(2000).optional(),
});

export const zCreateUser = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
  role: zUserRole,
  region: z.union([zRegion, z.literal('Nationwide')]),
  agencyCode: zAgencyCode.optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  badgeNumber: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  active: z.boolean().default(true),
  onDuty: z.boolean().default(false),
});

export const zUpdateUser = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().max(200).optional(),
  password: z.string().min(8).max(128).optional(),
  role: zUserRole.optional(),
  region: z.union([zRegion, z.literal('Nationwide')]).optional(),
  agencyCode: zAgencyCode.optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  badgeNumber: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  active: z.boolean().optional(),
  onDuty: z.boolean().optional(),
});

export const zUpsertHotline = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(2).max(120),
  number: z.string().min(2).max(40),
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
  availableHours: z.string().max(80).default('24/7'),
  isTollFree: z.boolean().default(false),
  priority: z.number().int().min(0).max(1000).default(100),
  active: z.boolean().default(true),
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export class ValidationError extends Error {
  code = 'VALIDATION_FAILED' as const;
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, label = 'Payload'): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      `${label} failed validation: ${result.error.issues.map((i) => i.message).join('; ')}`,
      result.error.flatten()
    );
  }
  return result.data;
}

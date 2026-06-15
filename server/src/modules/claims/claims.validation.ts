import { z } from 'zod';
import { CLAIM_STATES, CLAIM_STATUSES, ClaimStatus } from './claims.schema';

// ─── Reusable primitives ──────────────────────────────────────────────────────

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Must be a valid ID');

// ─── Reusable sub-schemas ─────────────────────────────────────────────────────

const claimantSchema = z.object({
  name: z.string().min(1, 'Claimant name is required'),
  dateOfBirth: z.string().datetime({ offset: true }).optional(),
  phone: z.string().optional(),
  email: z.string().email('Claimant email must be a valid email address').optional(),
});

const insurerSchema = z.object({
  name: z.string().min(1, 'Insurer name is required'),
  policyNumber: z.string().optional(),
  claimNumber: z.string().optional(),
});

// ─── Params schemas ───────────────────────────────────────────────────────────

/**
 * Zod schema for route params containing a MongoDB ObjectId.
 * Used for all :id route parameters.
 */
export const claimParamsSchema = z.object({ id: objectIdSchema });

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Zod schema for the POST /claims request body.
 * Validates all required and optional claim creation fields.
 */
export const createClaimSchema = z
  .object({
    state: z.enum(CLAIM_STATES, {
      errorMap: () => ({ message: `State must be one of: ${CLAIM_STATES.join(', ')}` }),
    }),
    claimant: claimantSchema,
    dateOfAccident: z.string().datetime({ offset: true }),
    insurer: insurerSchema,
    assignedTo: objectIdSchema.optional(),
  })
  .strict();

/**
 * Zod schema for the PATCH /claims/:id request body.
 * All top-level fields are optional; unknown fields are rejected.
 */
export const updateClaimSchema = z
  .object({
    claimant: claimantSchema.optional(),
    dateOfAccident: z.string().datetime({ offset: true }).optional(),
    insurer: insurerSchema.optional(),
    assignedTo: objectIdSchema.nullable().optional(),
  })
  .strict();

/**
 * Zod schema for the GET /claims query string.
 * Supports optional filters and cursor-based pagination.
 */
export const listClaimsSchema = z.object({
  state: z.enum(CLAIM_STATES).optional(),
  status: z.nativeEnum(
    Object.fromEntries(CLAIM_STATUSES.map((s) => [s, s])) as Record<ClaimStatus, ClaimStatus>,
  ).optional(),
  assignedTo: objectIdSchema.optional(),
  search: z.string().max(200).optional(),
  cursor: objectIdSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

/**
 * Zod schema for the PATCH /claims/:id/status request body.
 */
export const updateStatusSchema = z
  .object({
    status: z.enum(CLAIM_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${CLAIM_STATUSES.join(', ')}` }),
    }),
  })
  .strict();

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateClaimBody = z.infer<typeof createClaimSchema>;
export type UpdateClaimBody = z.infer<typeof updateClaimSchema>;
export type ListClaimsQuery = z.infer<typeof listClaimsSchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
export type ClaimParams = z.infer<typeof claimParamsSchema>;

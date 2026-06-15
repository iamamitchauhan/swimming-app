import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * POST /swimmers — create a new swimmer
 */
export const createSwimmerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  birthDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed < new Date();
  }, 'Valid birth date is required and must be in the past'),
  usaMembershipId: z.string().trim().optional(),
  clubName: z.string().trim().optional(),
});

/**
 * PUT /swimmers/:id — update swimmer information
 */
export const updateSwimmerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim().optional(),
  lastName: z.string().min(1, 'Last name is required').trim().optional(),
  birthDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed < new Date();
  }, 'Valid birth date is required and must be in the past').optional(),
  usaMembershipId: z.string().trim().optional(),
  clubName: z.string().trim().optional(),
});

/**
 * GET /swimmers — list query parameters
 */
export const swimmerListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sortBy: z.enum(['firstName', 'lastName', 'birthDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateSwimmerInput = z.infer<typeof createSwimmerSchema>;
export type UpdateSwimmerInput = z.infer<typeof updateSwimmerSchema>;
export type SwimmerListParams = z.infer<typeof swimmerListParamsSchema>;

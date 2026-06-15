import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * POST /registrations — create a new registration
 */
export const createRegistrationSchema = z.object({
  tryoutId: z.string().min(1, 'Tryout ID is required'),
  swimmerId: z.string().min(1, 'Swimmer ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  segmentId: z.string().min(1, 'Segment ID is required'),
});

/**
 * PUT /registrations/:id — update registration status
 */
export const updateRegistrationStatusSchema = z.object({
  status: z.enum(['registered', 'waitlisted', 'offered', 'rejected', 'cancelled']),
});

/**
 * GET /registrations/my-kids — list query parameters
 */
export const registrationListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['registered', 'waitlisted', 'offered', 'rejected', 'cancelled']).optional(),
  tryoutId: z.string().optional(),
  sortBy: z.enum(['registeredAt', 'status', 'waitlistPosition']).default('registeredAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>;
export type RegistrationListParams = z.infer<typeof registrationListParamsSchema>;

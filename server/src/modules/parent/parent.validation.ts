import { z } from 'zod';

/**
 * POST /parent/auth/register — accepts email, firstName, lastName; triggers verification email for parent registration.
 */
export const parentRegisterSchema = z
  .object({
    email: z.string().email('Email must be a valid email address').toLowerCase(),
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
  })
  .strict();

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ParentRegisterInput = z.infer<typeof parentRegisterSchema>;

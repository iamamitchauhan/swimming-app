import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').trim().optional(),
    lastName: z.string().min(1, 'Last name is required').trim().optional(),
  })
  .strict()
  .refine((d) => d.firstName !== undefined || d.lastName !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

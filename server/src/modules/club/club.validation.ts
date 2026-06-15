import { z } from 'zod';

export const rejectClubSchema = z
  .object({
    reason: z.string().min(10, 'Rejection reason must be at least 10 characters').trim(),
  })
  .strict();

export type RejectClubInput = z.infer<typeof rejectClubSchema>;

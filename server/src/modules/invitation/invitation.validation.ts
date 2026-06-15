import { z } from 'zod';
import { USER_ROLES } from '../../shared/constants/roles';

export const sendInvitationSchema = z
  .object({
    email: z.string().email('Must be a valid email address').toLowerCase(),
    role: z.enum([USER_ROLES.ADMIN, USER_ROLES.COACH], {
      errorMap: () => ({ message: 'Role must be admin or coach' }),
    }),
  })
  .strict();

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, 'Invitation token is required'),
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
  })
  .strict();

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

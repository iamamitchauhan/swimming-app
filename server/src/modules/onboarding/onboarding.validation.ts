import { z } from 'zod';

export const step1Schema = z
  .object({
    name: z.string().min(2, 'Club name must be at least 2 characters').trim(),
    address: z.string().min(5, 'Address must be at least 5 characters').trim(),
    phone: z
      .string()
      .min(7, 'Phone must be at least 7 characters')
      .regex(/^[+\d\s\-().]+$/, 'Phone number is invalid')
      .trim(),
    logoUrl: z.string().url('Logo URL must be valid').optional(),
    clubSize: z.string().optional(),
    region: z.string().optional(),
  })
  .strict();

export const step2Schema = z
  .object({
    coachEmails: z
      .array(z.string().email('Each coach email must be valid').toLowerCase())
      .max(50, 'Cannot invite more than 50 coaches at once')
      .default([]),
  })
  .strict();

export type Step1Input = z.infer<typeof step1Schema>;
export type Step2Input = z.infer<typeof step2Schema>;

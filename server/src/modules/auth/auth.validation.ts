import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/register — accepts email only; triggers verification email.
 */
export const registerSchema = z
  .object({
    email: z.string().email('Email must be a valid email address').toLowerCase(),
  })
  .strict();

/**
 * GET /auth/verify-email — token from query string.
 */
export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required'),
  })
  .strict();

/**
 * POST /auth/login — accepts email; triggers OTP.
 */
export const loginSchema = z
  .object({
    email: z.string().email('Email must be a valid email address').toLowerCase(),
  })
  .strict();

/**
 * POST /auth/verify-otp — submits 6-digit OTP for verification.
 */
export const verifyOtpSchema = z
  .object({
    email: z.string().email('Email must be a valid email address').toLowerCase(),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  })
  .strict();

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

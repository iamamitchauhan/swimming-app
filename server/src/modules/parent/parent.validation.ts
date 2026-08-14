import { z } from "zod";

/**
 * POST /parent/auth/register — accepts email, firstName, lastName; triggers verification email for parent registration.
 */
export const parentRegisterSchema = z
  .object({
    email: z.string().email("Email must be a valid email address").toLowerCase(),
    firstName: z.string().min(1, "First name is required").trim(),
    lastName: z.string().min(1, "Last name is required").trim(),
    redirectUrl: z.string().startsWith("/", "redirectUrl must be a relative path starting with /").optional(),
  })
  .strict();

/**
 * POST /parent/auth/login — send OTP to parent email
 */
export const parentLoginSchema = z
  .object({
    email: z.string().email("Email must be a valid email address").toLowerCase(),
  })
  .strict();

/**
 * POST /parent/auth/verify-otp — verify OTP and login
 */
export const parentVerifyOtpSchema = z
  .object({
    email: z.string().email("Email must be a valid email address").toLowerCase(),
    otp: z.string().length(6, "OTP must be 6 digits"),
  })
  .strict();

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ParentRegisterInput = z.infer<typeof parentRegisterSchema>;
export type ParentLoginInput = z.infer<typeof parentLoginSchema>;
export type ParentVerifyOtpInput = z.infer<typeof parentVerifyOtpSchema>;

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default("3001")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive()),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: z.string().optional().default(""),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN must be a duration like 15m, 1h, 7d")
    .default("7d"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required").default("http://localhost:3000"),
  SMTP_HOST: z.string().default("smtp.mailtrap.io"),
  SMTP_PORT: z
    .string()
    .default("587")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive()),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USERNAME: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM_NAME: z.string().default("Swimming App"),
  SMTP_FROM_EMAIL: z.string().email().default("noreply@swimmingapp.com"),
  APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL").default("http://localhost:3001"),
  CLIENT_BASE_URL: z.string().url("CLIENT_BASE_URL must be a valid URL").default("http://localhost:5002"),
  LANDING_BASE_URL: z.string().url("LANDING_BASE_URL must be a valid URL").default("http://localhost:5001"),
  OTP_EXPIRES_MINUTES: z
    .string()
    .default("10")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive()),
  EMAIL_VERIFY_EXPIRES_HOURS: z
    .string()
    .default("24")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive()),
  INVITATION_EXPIRES_HOURS: z
    .string()
    .default("48")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive()),
});

/**
 * Parses and validates all required environment variables at startup.
 * Throws a descriptive error listing every missing or invalid variable
 * so the process fails fast rather than at runtime.
 *
 * @returns Typed configuration object
 * @throws {Error} When one or more required variables are absent or invalid
 */
function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");

    throw new Error(`Environment configuration is invalid. Fix the following:\n${issues}`);
  }

  return result.data;
}

export const config = parseEnv();

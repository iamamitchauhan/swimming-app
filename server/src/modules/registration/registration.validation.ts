import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * POST /registrations — create a new registration
 */
export const dynamicAnswerSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.array(z.string())]),
});

export const createRegistrationSchema = z.object({
  tryoutId: z.string().min(1, "Tryout ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  slotId: z.string().min(1, "Slot ID is required"),
  segmentId: z.string().optional().default(""),

  swimmerFirstName: z.string().min(1, "First name is required"),
  swimmerLastName: z.string().min(1, "Last name is required"),
  swimmerDob: z.string().min(1, "Date of birth is required").optional(),
  ageOnTryoutDay: z.coerce.number().int().min(1).max(30),

  hasUsaMembership: z.boolean().default(false),
  usaMembershipId: z.string().optional().default(""),
  clubName: z.string().optional().default(""),

  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email("Valid guardian email is required"),

  dynamicAnswers: z.array(dynamicAnswerSchema).optional().default([]),
});

/**
 * PUT /registrations/:id — update registration status
 */
export const updateRegistrationStatusSchema = z.object({
  status: z.enum(["registered", "waitlisted", "offered", "rejected", "cancelled"]),
});

/**
 * GET /registrations/my-kids — list query parameters
 */
export const registrationListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["registered", "waitlisted", "offered", "rejected", "cancelled"]).optional(),
  tryoutId: z.string().optional(),
  sortBy: z.enum(["registeredAt", "status", "waitlistPosition"]).default("registeredAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>;
export type RegistrationListParams = z.infer<typeof registrationListParamsSchema>;

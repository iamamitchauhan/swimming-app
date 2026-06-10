import { z } from 'zod';
import { RULE_STATES } from './rules.schema';

// ─── Reusable primitives ──────────────────────────────────────────────────────

const ARBITRATION_PROVIDERS = ['AAA', 'JAMS', 'NAF'] as const;

// ─── Param schemas ────────────────────────────────────────────────────────────

/**
 * Zod schema for route params containing a state code.
 * Rejects any value outside the supported state enum.
 */
export const stateParamSchema = z.object({
  state: z.enum(RULE_STATES, {
    errorMap: () => ({ message: `State must be one of: ${RULE_STATES.join(', ')}` }),
  }),
});

// ─── Validation rule sub-schema ───────────────────────────────────────────────

const validationRuleItemSchema = z.object({
  ruleId: z.string().min(1),
  description: z.string().min(1),
  field: z.string().optional(),
  severity: z.enum(['error', 'warning']).default('error'),
  isActive: z.boolean().default(true),
});

// ─── Update schema ────────────────────────────────────────────────────────────

/**
 * Zod schema for the PUT /rules/:state request body.
 * All fields are optional; unknown fields are rejected (.strict()).
 */
export const updateRuleSchema = z
  .object({
    stateName: z.string().min(1).optional(),
    deadlines: z
      .object({
        nf2FilingDays: z.number().int().positive().optional(),
        billingSubmissionDays: z.number().int().positive().optional(),
        appealDays: z.number().int().positive().optional(),
        paymentDays: z.number().int().positive().optional(),
        statuteOfLimitationsYears: z.number().int().positive().optional(),
      })
      .optional(),
    requiredForms: z.array(z.string().min(1)).optional(),
    billingForms: z.array(z.string().min(1)).optional(),
    arbitrationProvider: z.enum(ARBITRATION_PROVIDERS).optional(),
    feeScheduleVersion: z.string().optional(),
    validationRules: z.array(validationRuleItemSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── Inferred types ───────────────────────────────────────────────────────────

export type StateParam = z.infer<typeof stateParamSchema>;
export type UpdateRuleBody = z.infer<typeof updateRuleSchema>;

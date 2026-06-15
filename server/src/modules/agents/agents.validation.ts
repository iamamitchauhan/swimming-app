import { z } from 'zod';

// ─── Param schemas ────────────────────────────────────────────────────────────

/**
 * Validates the :agentId route parameter.
 */
export const agentIdParamSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

/**
 * Validates the PATCH /agents/:agentId request body.
 * Rejects unknown fields via .strict().
 */
export const updateAgentConfigSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    config: z.record(z.unknown()).optional(),
  })
  .strict();

// ─── Query schemas ────────────────────────────────────────────────────────────

const ACTIVITY_LIMIT_MIN = 1;
const ACTIVITY_LIMIT_MAX = 100;
const ACTIVITY_LIMIT_DEFAULT = 20;

/**
 * Validates query parameters for GET /agents/activity.
 */
export const agentActivityQuerySchema = z.object({
  agentId: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : ACTIVITY_LIMIT_DEFAULT))
    .pipe(z.number().int().min(ACTIVITY_LIMIT_MIN).max(ACTIVITY_LIMIT_MAX))
    .default(String(ACTIVITY_LIMIT_DEFAULT)),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type AgentIdParam = z.infer<typeof agentIdParamSchema>;
export type UpdateAgentConfigBody = z.infer<typeof updateAgentConfigSchema>;
export type AgentActivityQuery = z.infer<typeof agentActivityQuerySchema>;

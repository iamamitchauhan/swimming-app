import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * GET /public/tryouts — list query parameters
 */
export const publicTryoutListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /public/tryouts/:id — path parameter validation
 */
export const publicTryoutIdSchema = z.object({
  id: z.string().min(1, 'Tryout ID is required'),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type PublicTryoutListParams = z.infer<typeof publicTryoutListParamsSchema>;
export type PublicTryoutIdParams = z.infer<typeof publicTryoutIdSchema>;
